import { MediaItem, WatchedEntry } from '../types';

type WorkLike = Pick<MediaItem, 'title' | 'category'> & { year?: number; sourceId?: string };

/** Lowercase, accent-free, punctuation-free title for comparing works across lists. */
export const normalizeTitle = (title: string): string =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Stable key of a work: category, normalized title and year (when known). */
export const workKey = (item: WorkLike): string =>
  `${item.category}|${normalizeTitle(item.title)}|${item.year || ''}`;

/**
 * Two items are the same work when they share the provider id or, when either lacks it,
 * the same category, normalized title and year (the year is ignored if either is unknown).
 */
export const isSameWork = (a: WorkLike, b: WorkLike): boolean => {
  if (a.sourceId && b.sourceId) return a.sourceId === b.sourceId;
  if (a.category !== b.category || normalizeTitle(a.title) !== normalizeTitle(b.title)) return false;
  return !a.year || !b.year || a.year === b.year;
};

/** Provider id of an item: the stored sourceId, or the id itself for unsaved search results. */
const providerId = (item: MediaItem): string | undefined =>
  item.sourceId ?? (/^(item|manual|link)-/.test(item.id) ? undefined : item.id);

/** Work identity used for comparisons; search results carry the provider id as their own id. */
export const toWork = (item: MediaItem): WorkLike => ({
  title: item.title,
  category: item.category,
  year: item.year,
  sourceId: providerId(item),
});

export const isItemInList = (item: MediaItem, listItems: MediaItem[]): boolean => {
  const work = toWork(item);
  return listItems.some(existing => isSameWork(work, toWork(existing)));
};

export const isWatchedIn = (item: MediaItem, entries: WatchedEntry[]): boolean => {
  if (entries.length === 0) return false;
  const work = toWork(item);
  return entries.some(entry => isSameWork(work, entry));
};

export const toWatchedEntry = (item: MediaItem): WatchedEntry => {
  const work = toWork(item);
  return {
    workKey: workKey(work),
    sourceId: work.sourceId,
    title: item.title,
    category: item.category,
    year: item.year || undefined,
    watchedAt: new Date().toISOString(),
  };
};
