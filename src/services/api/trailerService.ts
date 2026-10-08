import { MediaItem } from '../../types';
import { fetchTmdbTrailerKey } from './tmdbService';
import { fetchJikanTrailerKey } from './mediaSearchService';

/** Categorías con trailer de YouTube disponible. */
export const hasTrailerSupport = (item: MediaItem): boolean =>
  item.category === 'movie' || item.category === 'series' || item.category === 'anime';

/**
 * Clave de YouTube del trailer de una obra según su categoría:
 * películas y series en TMDB, anime en Jikan. El resto devuelve null sin hacer peticiones.
 */
export const fetchTrailerKey = (item: MediaItem): Promise<string | null> => {
  if (item.category === 'movie' || item.category === 'series') return fetchTmdbTrailerKey(item);
  if (item.category === 'anime') return fetchJikanTrailerKey(item);
  return Promise.resolve(null);
};
