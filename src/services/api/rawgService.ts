import { MediaItem, StreamingProvider } from '../../types';
import { createTimeoutController } from './requestController';

const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * Obtiene la API key de RAWG desde variables de entorno
 */
const getRawgApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_RAWG_API_KEY || null;
};

/**
 * Verifica si la API key de RAWG está configurada
 */
export const isRawgConfigured = (): boolean => {
  const key = getRawgApiKey();
  return Boolean(key && key.trim().length > 0);
};

/**
 * Elimina etiquetas HTML comunes de descripciones
 */
const stripHtml = (html?: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Mapea las tiendas o plataformas devueltas por RAWG a StreamingProvider
 */
const mapStoresAndPlatforms = (stores?: any[], platforms?: any[]): StreamingProvider[] => {
  const providers: StreamingProvider[] = [];
  const seen = new Set<string>();

  // 1. Tiendas digitales conocidas
  if (Array.isArray(stores)) {
    for (const item of stores) {
      const store = item.store || item;
      const slug = (store.slug || store.name || '').toLowerCase();
      const name = store.name || 'Tienda Digital';

      let providerId = `p-${slug}`;
      let color = '#333333';
      let url = store.domain ? `https://${store.domain}` : undefined;

      if (slug.includes('steam')) {
        providerId = 'p-steam';
        color = '#171A21';
        url = url || 'https://store.steampowered.com';
      } else if (slug.includes('playstation')) {
        providerId = 'p-playstation';
        color = '#003791';
        url = url || 'https://store.playstation.com';
      } else if (slug.includes('xbox')) {
        providerId = 'p-xbox';
        color = '#107C10';
        url = url || 'https://www.xbox.com';
      } else if (slug.includes('nintendo')) {
        providerId = 'p-nintendo';
        color = '#E60012';
        url = url || 'https://www.nintendo.com';
      } else if (slug.includes('epic')) {
        providerId = 'p-epic';
        color = '#2A2A2A';
        url = url || 'https://store.epicgames.com';
      } else if (slug.includes('gog')) {
        providerId = 'p-gog';
        color = '#8A2BE2';
        url = url || 'https://www.gog.com';
      }

      if (!seen.has(providerId)) {
        seen.add(providerId);
        providers.push({
          id: providerId,
          name,
          type: 'buy',
          color,
          url,
        });
      }
    }
  }

  // 2. Si no hay tiendas específicas, mapear plataformas de juego como proveedores
  if (providers.length === 0 && Array.isArray(platforms)) {
    for (const item of platforms.slice(0, 4)) {
      const plat = item.platform || item;
      const slug = (plat.slug || plat.name || '').toLowerCase();
      const name = plat.name || 'Plataforma';

      let providerId = `p-${slug}`;
      let color = '#4A5568';

      if (slug.includes('pc')) {
        providerId = 'p-steam';
        color = '#171A21';
      } else if (slug.includes('playstation')) {
        providerId = 'p-playstation';
        color = '#003791';
      } else if (slug.includes('xbox')) {
        providerId = 'p-xbox';
        color = '#107C10';
      } else if (slug.includes('nintendo') || slug.includes('switch')) {
        providerId = 'p-nintendo';
        color = '#E60012';
      }

      if (!seen.has(providerId)) {
        seen.add(providerId);
        providers.push({
          id: providerId,
          name,
          type: 'buy',
          color,
        });
      }
    }
  }

  return providers;
};

/**
 * Busca videojuegos en la API pública de RAWG
 */
export const searchRawg = async (
  query: string,
  limit: number = 8,
  signal?: AbortSignal
): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const apiKey = getRawgApiKey();
  if (!apiKey) {
    // Si no hay API key configurada, retorna vacío para permitir fallback inmediato al catálogo local
    return [];
  }

  try {
    const { controller, timeoutId } = createTimeoutController(4000, signal);

    const url = `${RAWG_BASE_URL}/games?key=${encodeURIComponent(
      apiKey
    )}&search=${encodeURIComponent(cleanQuery)}&page_size=${limit}&search_precise=true`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`RAWG search failed with status: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      return [];
    }

    const results: MediaItem[] = data.results.map((game: any) => {
      // 1. Fecha y año
      const releaseDate = game.released || undefined;
      let year = 2000;
      if (releaseDate && releaseDate.length >= 4) {
        const parsedYear = parseInt(releaseDate.substring(0, 4), 10);
        if (!isNaN(parsedYear)) year = parsedYear;
      }

      // 2. Plataformas como etiquetas de reparto o disponibilidad
      const platformNames = Array.isArray(game.platforms)
        ? game.platforms.map((p: any) => p.platform?.name).filter(Boolean).slice(0, 5)
        : [];

      // 3. Desarrollador / Estudio
      const developers = Array.isArray(game.developers) && game.developers.length > 0
        ? game.developers.map((d: any) => d.name).join(', ')
        : (Array.isArray(game.publishers) && game.publishers.length > 0
            ? game.publishers.map((p: any) => p.name).join(', ')
            : undefined);

      // 4. Géneros
      const genres = Array.isArray(game.genres)
        ? game.genres.map((g: any) => g.name).slice(0, 4)
        : ['Videojuego'];

      // 5. Calificación (RAWG rating es 0 a 5, metacritic es 0 a 100)
      let averageRating = 4.5;
      if (typeof game.rating === 'number' && game.rating > 0) {
        averageRating = Math.round(game.rating * 10) / 10;
      } else if (typeof game.metacritic === 'number') {
        averageRating = Math.round((game.metacritic / 20) * 10) / 10;
      }

      // 6. Sinopsis o descripción
      const synopsis =
        stripHtml(game.description_raw || game.description) ||
        `Videojuego aclamado disponible en ${platformNames.join(', ') || 'diversas plataformas'}. Calificación RAWG: ${game.rating || 'N/A'}/5.`;

      // 7. Poster e imagen de fondo
      const posterUrl =
        game.background_image ||
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80';

      const backdropUrl =
        game.short_screenshots?.[1]?.image ||
        game.background_image ||
        undefined;

      // 8. Proveedores (tiendas / plataformas)
      const whereToWatchOrRead = mapStoresAndPlatforms(game.stores, game.platforms);

      // 9. Enlaces externos
      const externalLinks: { label: string; url: string }[] = [];
      if (game.slug) {
        externalLinks.push({
          label: 'RAWG',
          url: `https://rawg.io/games/${game.slug}`,
        });
      }
      if (game.metacritic_url) {
        externalLinks.push({
          label: 'Metacritic',
          url: game.metacritic_url,
        });
      }

      return {
        id: `rawg-${game.id}`,
        title: game.name || 'Juego sin título',
        originalTitle: game.name_original || game.name,
        category: 'game',
        year,
        releaseDate,
        director: developers ? `Estudio: ${developers}` : (platformNames.length > 0 ? `Plataformas: ${platformNames.join(', ')}` : undefined),
        cast: platformNames,
        synopsis,
        posterUrl,
        backdropUrl,
        genres,
        averageRating,
        ratingsCount: game.ratings_count || 10,
        whereToWatchOrRead,
        externalLinks,
        isManualEntry: false,
        addedBy: {
          id: 'current-user',
          name: 'Tú',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        },
        addedAt: new Date().toISOString(),
        comments: [],
      };
    });

    return results;
  } catch (error) {
    console.warn('Error fetching from RAWG:', error);
    return [];
  }
};
