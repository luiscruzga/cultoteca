import { MediaItem } from '../types';

/** Critic/provider rating (0-5), or null when the item has none (manual entries, links). */
export const getCriticRating = (item: MediaItem): number | null => {
  if (typeof item.criticRating === 'number') return item.criticRating > 0 ? item.criticRating : null;
  // Legacy items stored the provider rating in averageRating.
  if (item.isManualEntry || item.category === 'link') return null;
  return item.averageRating > 0 ? item.averageRating : null;
};

/** Average of the latest rating given by each list user (comments plus the adder's initial rating). */
export const getListRating = (item: MediaItem): { average: number | null; count: number } => {
  const byUser = new Map<string, number>();
  const sorted = [...(item.comments || [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const comment of sorted) {
    if (comment.rating && comment.rating > 0) byUser.set(comment.userId, comment.rating);
  }
  if (!byUser.has(item.addedBy.id)) {
    const initial = item.userRating ?? (item.isManualEntry ? item.averageRating : undefined);
    if (initial && initial > 0) byUser.set(item.addedBy.id, initial);
  }
  if (byUser.size === 0) return { average: null, count: 0 };
  const total = [...byUser.values()].reduce((sum, r) => sum + r, 0);
  return { average: Math.round((total / byUser.size) * 10) / 10, count: byUser.size };
};

export type ItemSortMode = 'recent' | 'list' | 'critic';

export const sortItems = (items: MediaItem[], mode: ItemSortMode): MediaItem[] => {
  if (mode === 'recent') return items;
  const score = (item: MediaItem) => (mode === 'list' ? getListRating(item).average : getCriticRating(item)) ?? -1;
  const tieBreak = (item: MediaItem) =>
    (mode === 'list' ? getCriticRating(item) : getListRating(item).average) ?? -1;
  // Array.prototype.sort is stable, so equal scores keep their recent order.
  return [...items].sort((a, b) => score(b) - score(a) || tieBreak(b) - tieBreak(a));
};
