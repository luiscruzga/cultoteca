import { MediaItem } from '../types';

export interface RouletteFilters {
  platform?: string;
  minRating?: number;
  includeWatched?: boolean;
  /** Personal watched predicate of the current user. */
  isWatched?: (item: MediaItem) => boolean;
}

export const CultoRouletteService = {
  spin(items: MediaItem[], filters?: RouletteFilters): { selected: MediaItem | null; poolCount: number } {
    if (!items || items.length === 0) {
      return { selected: null, poolCount: 0 };
    }

    // By default, exclude items the current user already watched/read
    const isWatched = filters?.isWatched ?? (() => false);
    let candidatePool = filters?.includeWatched
      ? [...items]
      : items.filter(item => !isWatched(item));

    if (filters?.platform && filters.platform !== 'all') {
      candidatePool = candidatePool.filter(item =>
        item.whereToWatchOrRead.some(
          p => p.name.toLowerCase() === filters.platform!.toLowerCase()
        )
      );
    }

    if (filters?.minRating) {
      candidatePool = candidatePool.filter(item => item.averageRating >= filters.minRating!);
    }

    if (candidatePool.length === 0) {
      return { selected: null, poolCount: 0 };
    }

    const randomIndex = Math.floor(Math.random() * candidatePool.length);
    return {
      selected: candidatePool[randomIndex],
      poolCount: candidatePool.length,
    };
  },
};
