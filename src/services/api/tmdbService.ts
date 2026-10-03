import {
  CastMember,
  MediaCategory,
  MediaItem,
  PersonDetails,
  ReleaseEpisodeInfo,
  ReleaseTrackingInfo,
  StreamingProvider,
} from '../../types';
import { createTimeoutController } from './requestController';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';
const TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';
const TMDB_PROFILE_LARGE_BASE = 'https://image.tmdb.org/t/p/h632';
const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80';

const GENRE_MAP: Record<number, string> = {
  // Películas
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familiar',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia Ficción',
  10770: 'Película de TV',
  53: 'Suspense',
  10752: 'Guerra',
  37: 'Western',
  // Series
  10759: 'Acción y Aventura',
  10762: 'Infantil',
  10763: 'Noticias',
  10764: 'Reality',
  10765: 'Sci-Fi y Fantasía',
  10766: 'Telenovela',
  10767: 'Charla',
  10768: 'Guerra y Política',
};

const getApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_TMDB_API_KEY || null;
};

export const isTmdbConfigured = (): boolean => {
  const key = getApiKey();
  return Boolean(key && key.trim().length > 0);
};

interface TmdbWatchProviderItem {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface TmdbWatchProvidersResult {
  link?: string;
  flatrate?: TmdbWatchProviderItem[];
  rent?: TmdbWatchProviderItem[];
  buy?: TmdbWatchProviderItem[];
}

/**
 * Consulta proveedores de streaming de JustWatch mediante TMDB /watch/providers
 */
export const fetchTmdbWatchProviders = async (
  id: number,
  type: 'movie' | 'tv',
  preferredRegions: string[] = ['CL', 'ES', 'MX', 'AR', 'US'],
  signal?: AbortSignal
): Promise<{ providers: StreamingProvider[]; justWatchLink?: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) return { providers: [] };

  try {
    const { controller, timeoutId } = createTimeoutController(3000, signal);

    const res = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/watch/providers?api_key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return { providers: [] };

    const data = await res.json();
    const results = data.results || {};

    let selectedRegionData: TmdbWatchProvidersResult | null = null;
    for (const region of preferredRegions) {
      if (results[region]) {
        selectedRegionData = results[region];
        break;
      }
    }

    if (!selectedRegionData) {
      const firstAvailableKey = Object.keys(results)[0];
      if (firstAvailableKey) {
        selectedRegionData = results[firstAvailableKey];
      }
    }

    if (!selectedRegionData) return { providers: [] };

    const providers: StreamingProvider[] = [];

    if (selectedRegionData.flatrate) {
      for (const p of selectedRegionData.flatrate) {
        providers.push({
          id: `tmdb-provider-${p.provider_id}`,
          name: p.provider_name,
          type: 'stream',
          logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : undefined,
        });
      }
    }

    if (selectedRegionData.rent) {
      for (const p of selectedRegionData.rent) {
        if (!providers.some(existing => existing.name === p.provider_name)) {
          providers.push({
            id: `tmdb-provider-${p.provider_id}`,
            name: p.provider_name,
            type: 'rent',
            logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : undefined,
          });
        }
      }
    }

    if (selectedRegionData.buy) {
      for (const p of selectedRegionData.buy) {
        if (!providers.some(existing => existing.name === p.provider_name)) {
          providers.push({
            id: `tmdb-provider-${p.provider_id}`,
            name: p.provider_name,
            type: 'buy',
            logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : undefined,
          });
        }
      }
    }

    return {
      providers,
      justWatchLink: selectedRegionData.link,
    };
  } catch {
    return { providers: [] };
  }
};

/**
 * Consulta el elenco (cast) y director(a) en TMDB /credits
 */
export const fetchTmdbCredits = async (
  id: number,
  type: 'movie' | 'tv' = 'movie',
  signal?: AbortSignal
): Promise<{ cast: string[]; castMembers: CastMember[]; director?: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) return { cast: [], castMembers: [] };

  try {
    const { controller, timeoutId } = createTimeoutController(3500, signal);

    const url = `${TMDB_BASE_URL}/${type}/${id}/credits?api_key=${apiKey}&language=es-ES`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return { cast: [], castMembers: [] };

    const data = await res.json();
    const castMembers: CastMember[] = (data.cast || [])
      .filter((c: any) => c?.name)
      .slice(0, 8)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character || undefined,
        profileUrl: c.profile_path ? `${TMDB_PROFILE_BASE}${c.profile_path}` : undefined,
      }));
    const cast = castMembers.map(c => c.name);

    let director: string | undefined;
    if (type === 'movie' && Array.isArray(data.crew)) {
      const dirObj = data.crew.find((c: any) => c.job === 'Director');
      if (dirObj) director = dirObj.name;
    }

    return { cast, castMembers, director };
  } catch {
    return { cast: [], castMembers: [] };
  }
};

/**
 * Convierte un resultado de TMDB (búsqueda o créditos de persona) en un MediaItem
 */
const mapTmdbResult = (item: any, type: 'movie' | 'tv'): MediaItem => {
  const isMovie = type === 'movie';
  const title = isMovie ? item.title : item.name;
  const originalTitle = isMovie ? item.original_title : item.original_name;
  const dateStr = isMovie ? item.release_date : item.first_air_date;
  const year = dateStr ? new Date(dateStr).getFullYear() : 2024;
  const mediaCategory: MediaCategory = isMovie ? 'movie' : 'series';

  const genres = (item.genre_ids || [])
    .map((id: number) => GENRE_MAP[id])
    .filter(Boolean);

  const averageRating = item.vote_average
    ? Math.round((item.vote_average / 2) * 10) / 10
    : 4.5;

  return {
    id: `tmdb-${type}-${item.id}`,
    title: title || 'Sin título',
    originalTitle: originalTitle !== title ? originalTitle : undefined,
    category: mediaCategory,
    year: isNaN(year) ? 2024 : year,
    releaseDate: dateStr || undefined,
    synopsis: item.overview || 'Sinopsis no disponible en español.',
    posterUrl: item.poster_path
      ? `${TMDB_IMAGE_BASE}${item.poster_path}`
      : FALLBACK_POSTER,
    backdropUrl: item.backdrop_path
      ? `${TMDB_BACKDROP_BASE}${item.backdrop_path}`
      : undefined,
    genres: genres.length > 0 ? genres : [isMovie ? 'Película' : 'Serie'],
    averageRating,
    ratingsCount: item.vote_count || 10,
    whereToWatchOrRead: [],
    externalLinks: [
      {
        label: 'TMDB',
        url: `https://www.themoviedb.org/${type}/${item.id}`,
      },
    ],
    isManualEntry: false,
    addedBy: {
      id: 'current-user',
      name: 'Tú',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    },
    addedAt: new Date().toISOString(),
    comments: [],
  };
};

/**
 * Busca películas y series en TMDB
 */
export const searchTmdb = async (
  query: string,
  category: 'movie' | 'series' | 'all' = 'all',
  limit: number = 6,
  signal?: AbortSignal
): Promise<MediaItem[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const searchTypes: ('movie' | 'tv')[] = [];
  if (category === 'movie' || category === 'all') searchTypes.push('movie');
  if (category === 'series' || category === 'all') searchTypes.push('tv');

  const searchType = async (type: 'movie' | 'tv'): Promise<MediaItem[]> => {
    const { controller, timeoutId } = createTimeoutController(4000, signal);
    try {
      const url = `${TMDB_BASE_URL}/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(
        cleanQuery
      )}&language=es-ES&page=1&include_adult=false`;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];

      const data = await res.json();
      const results = (data.results || []).slice(0, limit);

      // Proveedores y créditos se cargan bajo demanda con enrichTmdbItem
      return results.map((item: any) => mapTmdbResult(item, type));
    } catch (e) {
      if (!signal?.aborted) console.warn(`Error buscando ${type} en TMDB:`, e);
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const perType = await Promise.all(searchTypes.map(searchType));
  return perType.flat();
};

const enrichCache = new Map<string, Promise<MediaItem>>();

export const isTmdbSearchItem = (item: MediaItem): boolean =>
  /^tmdb-(movie|tv)-\d+$/.test(item.id);

/**
 * Completa un resultado de búsqueda de TMDB con proveedores (JustWatch) y créditos.
 * Las peticiones se cachean por id; si fallan se devuelve el item original.
 */
export const enrichTmdbItem = (item: MediaItem): Promise<MediaItem> => {
  const match = item.id.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (!match) return Promise.resolve(item);

  const cached = enrichCache.get(item.id);
  if (cached) return cached;

  const type = match[1] as 'movie' | 'tv';
  const tmdbId = Number(match[2]);

  const promise = Promise.all([
    fetchTmdbWatchProviders(tmdbId, type),
    fetchTmdbCredits(tmdbId, type),
  ])
    .then(([{ providers, justWatchLink }, { cast, castMembers, director }]): MediaItem => {
      const externalLinks = [...(item.externalLinks || [])];
      if (justWatchLink && !externalLinks.some(l => l.label === 'JustWatch')) {
        externalLinks.push({ label: 'JustWatch', url: justWatchLink });
      }
      return {
        ...item,
        whereToWatchOrRead: providers.length > 0 ? providers : item.whereToWatchOrRead,
        cast: cast.length > 0 ? cast : item.cast,
        castMembers: castMembers.length > 0 ? castMembers : item.castMembers,
        director: director || item.director,
        externalLinks,
      };
    })
    .catch(() => {
      enrichCache.delete(item.id);
      return item;
    });

  enrichCache.set(item.id, promise);
  return promise;
};

const personCache = new Map<string, Promise<PersonDetails | null>>();

const fetchTmdbJson = async (path: string, timeoutMs: number): Promise<any | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const { controller, timeoutId } = createTimeoutController(timeoutMs);
  try {
    const separator = path.includes('?') ? '&' : '?';
    const res = await fetch(`${TMDB_BASE_URL}${path}${separator}api_key=${apiKey}`, {
      signal: controller.signal,
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

/** Resuelve el id de TMDB de una persona buscando por nombre (items sin ids guardados). */
const searchTmdbPersonId = async (name: string): Promise<number | null> => {
  const data = await fetchTmdbJson(
    `/search/person?query=${encodeURIComponent(name)}&language=es-ES&include_adult=false`,
    4000
  );
  const results: any[] = data?.results || [];
  const match =
    results.find(r => r.known_for_department === 'Acting') || results[0];
  return match?.id ?? null;
};

/**
 * Consulta la ficha de una persona (foto, biografía y filmografía de películas y series).
 * Usa el id de TMDB si está disponible y si no busca por nombre. Devuelve null si no se encuentra.
 */
export const fetchTmdbPersonDetails = (member: CastMember): Promise<PersonDetails | null> => {
  if (!isTmdbConfigured()) return Promise.resolve(null);

  const cacheKey = member.id ? `id:${member.id}` : `name:${member.name.toLowerCase()}`;
  const cached = personCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async (): Promise<PersonDetails | null> => {
    const personId = member.id ?? (await searchTmdbPersonId(member.name));
    if (!personId) return null;

    const data = await fetchTmdbJson(
      `/person/${personId}?language=es-ES&append_to_response=combined_credits`,
      5000
    );
    if (!data) return null;

    let biography: string | undefined = data.biography?.trim() || undefined;
    if (!biography) {
      const english = await fetchTmdbJson(`/person/${personId}?language=en-US`, 4000);
      biography = english?.biography?.trim() || undefined;
    }

    const seen = new Set<string>();
    const credits = ((data.combined_credits?.cast || []) as any[])
      .filter(c => c.media_type === 'movie' || c.media_type === 'tv')
      // Excluye talk shows, noticias, realities y apariciones como sí mismo (galas, entrevistas)
      .filter(c => !(c.genre_ids || []).some((g: number) => [10763, 10764, 10767].includes(g)))
      .filter(c => !/^(self|himself|herself|themselves|sí mismo|sí misma)\b/i.test(c.character || ''))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .filter(c => {
        const key = `${c.media_type}-${c.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 40)
      .map(c => ({
        item: mapTmdbResult(c, c.media_type),
        character: c.character || undefined,
      }));

    return {
      id: personId,
      name: data.name || member.name,
      profileUrl: data.profile_path
        ? `${TMDB_PROFILE_LARGE_BASE}${data.profile_path}`
        : member.profileUrl,
      biography,
      birthday: data.birthday || undefined,
      deathday: data.deathday || undefined,
      placeOfBirth: data.place_of_birth || undefined,
      knownForDepartment: data.known_for_department || undefined,
      tmdbUrl: `https://www.themoviedb.org/person/${personId}`,
      credits,
    };
  })().then(result => {
    if (!result) personCache.delete(cacheKey);
    return result;
  });

  personCache.set(cacheKey, promise);
  return promise;
};

/**
 * Consulta la información del próximo episodio y el estado de emisión de una serie en TMDB
 */
export const fetchTvShowNextEpisode = async (
  tvId: number
): Promise<{ nextEpisode?: ReleaseEpisodeInfo; status?: string } | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=es-ES`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    const status = data.status || undefined;
    const next = data.next_episode_to_air;

    if (!next || !next.air_date) {
      return { status };
    }

    const nextEpisode: ReleaseEpisodeInfo = {
      seasonNumber: next.season_number,
      episodeNumber: next.episode_number,
      name: next.name || undefined,
      airDate: next.air_date,
      overview: next.overview || undefined,
    };

    return { nextEpisode, status };
  } catch (error) {
    console.warn(`Error fetching next episode for TV show ${tvId} from TMDB:`, error);
    return null;
  }
};

