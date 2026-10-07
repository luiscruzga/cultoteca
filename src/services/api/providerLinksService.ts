import { MediaItem, StreamingProvider } from '../../types';
import { getPlatformSearchUrl, isSamePlatform } from '../../utils/platformLogos';
import { providerId } from '../../utils/mediaIdentity';
import { createTimeoutController } from './requestController';
import { requestBackend } from './searchProxyService';
import { PREFERRED_REGIONS } from './tmdbService';

/**
 * Enlaces directos al título en cada plataforma ("abrir en Netflix" lleva a la película).
 * Se resuelven bajo demanda al abrir un detalle, con caché de sesión por obra, y nunca
 * se escriben en las listas guardadas.
 */

const SOURCE_TIMEOUT_MS = 4000;
const BACKEND_TIMEOUT_MS = 6000;

interface ResolvedLink {
  name: string;
  url: string;
  type: StreamingProvider['type'];
}

interface SourceResult {
  links: ResolvedLink[];
  /** 'replace': los enlaces sustituyen a los proveedores (si hay alguno); 'merge': completan los existentes. */
  mode: 'merge' | 'replace';
  /** Si un enlace sin proveedor equivalente se agrega como proveedor nuevo. */
  addNew: (link: ResolvedLink) => boolean;
}

/** Una fuente devuelve null ante un fallo, para no cachearlo. */
type Source = { key: string; load: () => Promise<SourceResult | null> };

// ==========================================
// DESTINO DE UN PROVEEDOR (cadena de fallback)
// ==========================================

/** Si la URL apunta a una página concreta y no a la portada de la plataforma. */
const hasTitlePath = (url: string): boolean => {
  const match = url.match(/^https?:\/\/[^/?#]+(\/[^?#]*)?/i);
  return Boolean(match && match[1] && match[1] !== '/');
};

export interface ProviderDestination {
  url: string;
  /** 'search': búsqueda dentro de la plataforma; su app nativa suele descartar la consulta. */
  kind: 'direct' | 'search' | 'fallback';
}

/**
 * Destino al tocar un proveedor: enlace directo → búsqueda dentro de la plataforma →
 * JustWatch (cine y series) → undefined (badge no tocable).
 */
export const resolveDestinationTarget = (provider: StreamingProvider, item: MediaItem): ProviderDestination | undefined => {
  if (provider.url && (provider.linkKind || hasTitlePath(provider.url))) return { url: provider.url, kind: 'direct' };

  const searchUrl = getPlatformSearchUrl(provider.name, item.title);
  if (searchUrl) return { url: searchUrl, kind: 'search' };

  if (item.category === 'movie' || item.category === 'series') {
    const justWatch = item.externalLinks?.find(link => link.label === 'JustWatch')?.url;
    if (justWatch) return { url: justWatch, kind: 'fallback' };
  }
  return undefined;
};

// ==========================================
// FUENTES POR CATEGORÍA
// ==========================================

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const { controller, timeoutId } = createTimeoutController(SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const isHttpUrl = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\//i.test(value);

interface BackendLinksResponse {
  configured: boolean;
  country: string | null;
  links: { name: string; type: 'stream' | 'rent' | 'buy'; url: string }[];
  error?: string;
}

const tmdbSource = (type: string, tmdbId: string): Source => ({
  key: `tmdb-${type}-${tmdbId}`,
  load: async () => {
    const res = await requestBackend<BackendLinksResponse>(
      `/api/providers/links?type=${type}&tmdbId=${tmdbId}&countries=${PREFERRED_REGIONS.join(',')}`,
      undefined,
      BACKEND_TIMEOUT_MS
    );
    if (!res || res.error || !Array.isArray(res.links)) return null;
    return {
      links: res.links.filter(link => isHttpUrl(link.url)),
      mode: 'merge',
      // Solo se suman plataformas de suscripción: alquiler y compra no inundan la vista
      addNew: link => link.type === 'stream',
    };
  },
});

const jikanSource = (malId: string): Source => ({
  key: `jikan-${malId}`,
  load: async () => {
    const res = await fetchJson<{ data?: { name?: string; url?: string }[] }>(
      `https://api.jikan.moe/v4/anime/${malId}/streaming`
    );
    if (!res || !Array.isArray(res.data)) return null;
    return {
      links: res.data
        .filter(entry => entry.name && isHttpUrl(entry.url))
        .map(entry => ({ name: entry.name!, url: entry.url!, type: 'stream' as const })),
      mode: 'replace',
      addNew: () => true,
    };
  },
});

/** Claves de `attributes.links` de MangaDex que son tiendas o ediciones oficiales. */
const MANGADEX_STORES: { key: string; name: string; type: StreamingProvider['type']; base?: string }[] = [
  { key: 'amz', name: 'Amazon Kindle', type: 'buy' },
  { key: 'bw', name: 'BookWalker', type: 'buy', base: 'https://bookwalker.jp/' },
  { key: 'ebj', name: 'eBookJapan', type: 'buy' },
  { key: 'cdj', name: 'CDJapan', type: 'buy' },
  { key: 'engtl', name: 'Edición oficial en inglés', type: 'read' },
  { key: 'raw', name: 'Edición original', type: 'read' },
];

const mangaDexSource = (mangaId: string): Source => ({
  key: `mangadex-${mangaId}`,
  load: async () => {
    const res = await fetchJson<{ data?: { attributes?: { links?: Record<string, string> | null } } }>(
      `https://api.mangadex.org/manga/${mangaId}`
    );
    if (!res?.data) return null;
    const links = res.data.attributes?.links || {};
    return {
      links: MANGADEX_STORES.flatMap(store => {
        const value = links[store.key];
        if (!value) return [];
        const url = /^https?:\/\//i.test(value) ? value : store.base ? `${store.base}${value.replace(/^\/+/, '')}` : null;
        return url ? [{ name: store.name, url, type: store.type }] : [];
      }),
      mode: 'merge',
      addNew: () => true,
    };
  },
});

/** IDs de tienda de RAWG (/stores). */
const RAWG_STORE_NAMES: Record<number, string> = {
  1: 'Steam',
  2: 'Xbox Store',
  3: 'PlayStation Store',
  4: 'App Store',
  5: 'GOG',
  6: 'Nintendo eShop',
  7: 'Xbox 360 Store',
  8: 'Google Play',
  9: 'itch.io',
  11: 'Epic Games',
};

const rawgSource = (gameId: string): Source | null => {
  const apiKey = process.env.EXPO_PUBLIC_RAWG_API_KEY;
  if (!apiKey) return null;
  return {
    key: `rawg-${gameId}`,
    load: async () => {
      const res = await fetchJson<{ results?: { store_id?: number; url?: string }[] }>(
        `https://api.rawg.io/api/games/${gameId}/stores?key=${apiKey}`
      );
      if (!res || !Array.isArray(res.results)) return null;
      return {
        links: res.results.flatMap(entry => {
          const name = entry.store_id ? RAWG_STORE_NAMES[entry.store_id] : undefined;
          return name && isHttpUrl(entry.url) ? [{ name, url: entry.url, type: 'buy' as const }] : [];
        }),
        mode: 'merge',
        addNew: () => true,
      };
    },
  };
};

/** Artista de un ítem de música (iTunes lo guarda como primer elemento de `cast`). */
const musicArtist = (item: MediaItem): string | undefined =>
  item.cast?.[0] || item.director?.replace(/^Artista:\s*/, '') || undefined;

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Tema equivalente en Deezer (API pública sin key; en web la bloquea CORS y se usa el fallback).
 * Solo se acepta el primer resultado si el artista coincide, para no enlazar otro tema.
 */
const deezerSource = (artist: string, title: string): Source => ({
  key: `deezer-${normalize(artist)}-${normalize(title)}`,
  load: async () => {
    const res = await fetchJson<{ data?: { link?: string; artist?: { name?: string } }[] }>(
      `https://api.deezer.com/search?q=${encodeURIComponent(`${artist} ${title}`)}&limit=5`
    );
    if (!res || !Array.isArray(res.data)) return null;
    const wanted = normalize(artist);
    const track = res.data.find(entry => {
      const found = normalize(entry.artist?.name || '');
      return Boolean(found) && (found.includes(wanted) || wanted.includes(found));
    });
    return {
      links: track && isHttpUrl(track.link) ? [{ name: 'Deezer', url: track.link, type: 'stream' as const }] : [],
      mode: 'merge',
      addNew: () => true,
    };
  },
});

const sourceFor = (item: MediaItem): Source | null => {
  const id = providerId(item) || '';
  let match = id.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (match) return tmdbSource(match[1], match[2]);
  if ((match = id.match(/^jikan-(\d+)$/))) return jikanSource(match[1]);
  if ((match = id.match(/^mangadex-([\w-]+)$/))) return mangaDexSource(match[1]);
  if ((match = id.match(/^rawg-(\d+)$/))) return rawgSource(match[1]);
  if (item.category === 'music') {
    const artist = musicArtist(item);
    if (artist && item.title) return deezerSource(artist, item.title);
  }
  return null;
};

// ==========================================
// MERGE Y CACHÉ DE SESIÓN
// ==========================================

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const toProvider = (link: ResolvedLink, existing?: StreamingProvider): StreamingProvider => ({
  ...(existing || { id: `link-${slug(link.name)}`, name: link.name, type: link.type }),
  url: link.url,
  linkKind: 'direct',
});

const mergeLinks = (providers: StreamingProvider[], result: SourceResult): StreamingProvider[] => {
  if (result.mode === 'replace' && result.links.length > 0) {
    return result.links.map(link => toProvider(link, providers.find(p => isSamePlatform(p.name, link.name))));
  }

  const merged = [...providers];
  const linked = new Set<number>();
  for (const link of result.links) {
    const index = merged.findIndex((p, i) => !linked.has(i) && isSamePlatform(p.name, link.name));
    if (index >= 0) {
      merged[index] = toProvider(link, merged[index]);
      linked.add(index);
    } else if (result.addNew(link) && !merged.some(p => isSamePlatform(p.name, link.name))) {
      merged.push(toProvider(link));
      linked.add(merged.length - 1);
    }
  }
  return merged;
};

const sessionCache = new Map<string, Promise<SourceResult | null>>();

/**
 * Devuelve el ítem con los enlaces directos de sus proveedores. Ante cualquier fallo o
 * cancelación devuelve el ítem sin cambios; los fallos no se cachean.
 */
export const resolveProviderLinks = async (item: MediaItem, signal?: AbortSignal): Promise<MediaItem> => {
  const source = sourceFor(item);
  if (!source) return item;

  let pending = sessionCache.get(source.key);
  if (!pending) {
    pending = source.load().catch(() => null);
    sessionCache.set(source.key, pending);
  }

  const result = await pending;
  if (!result) sessionCache.delete(source.key);
  if (!result || signal?.aborted) return item;

  return { ...item, whereToWatchOrRead: mergeLinks(item.whereToWatchOrRead || [], result) };
};
