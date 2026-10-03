import { CollaborativeList, DirectRecommendation, MediaItem } from '../types';
import { getCriticRating, getListRating } from '../utils/ratings';

/** An item together with the list it lives in, so the UI can open it in context. */
export interface FeedEntry {
  item: MediaItem;
  list: CollaborativeList;
}

export interface TrendingEntry extends FeedEntry {
  score: number;
  listsCount: number;
  contributorsCount: number;
  rating: number | null;
}

export interface FeaturedList {
  list: CollaborativeList;
  contributorsCount: number;
  recentAdds: number;
}

export interface HomeFeed {
  news: FeedEntry[];
  trending: TrendingEntry[];
  forYou: FeedEntry[];
  nextUp: FeedEntry[];
  friendRecommendations: DirectRecommendation[];
  featuredLists: FeaturedList[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NEWS_WINDOW_DAYS = 14;
const BAYES_PRIOR_VOTES = 3;
const RECENCY_HALF_LIFE_DAYS = 30;

const titleKey = (item: MediaItem) =>
  `${item.category}::${item.title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`;

const daysSince = (iso: string | undefined, now: number) => {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(time) ? Math.max(0, (now - time) / DAY_MS) : 365;
};

const isMember = (list: CollaborativeList, userId: string) =>
  list.owner.id === userId || list.collaborators.some(c => c.id === userId);

/**
 * Trending titles: identical titles across visible lists are grouped and ranked by
 *   bayesian(user ratings → critic fallback) + 0.6·ln(1+lists) + 0.4·ln(1+contributors) + recency,
 * where bayesian = (v·R + m·C) / (v + m) shrinks titles with few votes towards the global mean C.
 */
const computeTrending = (lists: CollaborativeList[], now: number, limit: number): TrendingEntry[] => {
  const groups = new Map<
    string,
    { entry: FeedEntry; listIds: Set<string>; contributors: Set<string>; ratings: number[]; votes: number; newest: string; critic: number | null }
  >();

  for (const list of lists) {
    for (const item of list.items) {
      const key = titleKey(item);
      const group =
        groups.get(key) ??
        { entry: { item, list }, listIds: new Set<string>(), contributors: new Set<string>(), ratings: [], votes: 0, newest: '', critic: null };
      group.listIds.add(list.id);
      group.contributors.add(item.addedBy.id);
      const listRating = getListRating(item);
      if (listRating.average !== null) {
        group.ratings.push(listRating.average * listRating.count);
        group.votes += listRating.count;
      }
      group.critic = group.critic ?? getCriticRating(item);
      if ((item.addedAt || '') > group.newest) {
        group.newest = item.addedAt || '';
        // Point to the most recent copy so the user lands on an active list.
        group.entry = { item, list };
      }
      groups.set(key, group);
    }
  }

  const all = [...groups.values()];
  const rated = all.map(g => (g.votes > 0 ? g.ratings.reduce((a, b) => a + b, 0) / g.votes : g.critic)).filter(
    (r): r is number => r !== null
  );
  const globalMean = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 3;

  return all
    .map(group => {
      const userMean = group.votes > 0 ? group.ratings.reduce((a, b) => a + b, 0) / group.votes : null;
      const observed = userMean ?? group.critic ?? globalMean;
      const votes = userMean !== null ? group.votes : group.critic !== null ? 1 : 0;
      const bayes = (votes * observed + BAYES_PRIOR_VOTES * globalMean) / (votes + BAYES_PRIOR_VOTES);
      const recency = Math.exp(-daysSince(group.newest, now) / RECENCY_HALF_LIFE_DAYS);
      const score =
        bayes + 0.6 * Math.log1p(group.listIds.size) + 0.4 * Math.log1p(group.contributors.size) + recency;
      return {
        ...group.entry,
        score,
        listsCount: group.listIds.size,
        contributorsCount: group.contributors.size,
        rating: userMean ?? group.critic,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

/** Affinity of an item with the user's taste (category and genre frequencies of their items). */
const buildTasteProfile = (myItems: MediaItem[]) => {
  const categories = new Map<string, number>();
  const genres = new Map<string, number>();
  for (const item of myItems) {
    categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
    for (const genre of item.genres) {
      const g = genre.toLowerCase();
      genres.set(g, (genres.get(g) ?? 0) + 1);
    }
  }
  const total = Math.max(1, myItems.length);
  return (item: MediaItem) => {
    const categoryAffinity = (categories.get(item.category) ?? 0) / total;
    const genreAffinity =
      item.genres.reduce((sum, g) => sum + (genres.get(g.toLowerCase()) ?? 0), 0) / total / Math.max(1, item.genres.length);
    return 2 * categoryAffinity + genreAffinity;
  };
};

export const buildHomeFeed = ({
  lists,
  userId,
  followedListIds,
  recommendations,
  now = Date.now(),
}: {
  lists: CollaborativeList[];
  userId: string;
  followedListIds: string[];
  recommendations: DirectRecommendation[];
  now?: number;
}): HomeFeed => {
  const myLists = lists.filter(l => isMember(l, userId));
  const followedLists = lists.filter(l => l.isPublic && !isMember(l, userId) && followedListIds.includes(l.id));
  const visibleLists = lists.filter(l => l.isPublic || isMember(l, userId));
  const myItems = myLists.flatMap(l => l.items.filter(i => i.addedBy.id === userId));
  const ownedKeys = new Set(myLists.flatMap(l => l.items.map(titleKey)));

  // News: what others added recently to my lists and to the lists I follow.
  const news = [...myLists, ...followedLists]
    .flatMap(list => list.items.map(item => ({ item, list })))
    .filter(({ item }) => item.addedBy.id !== userId && daysSince(item.addedAt, now) <= NEWS_WINDOW_DAYS)
    .sort((a, b) => (b.item.addedAt || '').localeCompare(a.item.addedAt || ''))
    .slice(0, 10);

  const trending = computeTrending(visibleLists, now, 10);

  // For you: public items I do not have, ranked by taste affinity and quality.
  const affinity = buildTasteProfile(myItems);
  const seen = new Set<string>();
  const forYou = lists
    .filter(l => l.isPublic && !isMember(l, userId))
    .flatMap(list => list.items.map(item => ({ item, list })))
    .filter(({ item }) => {
      const key = titleKey(item);
      if (ownedKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(entry => {
      const quality = (getListRating(entry.item).average ?? getCriticRating(entry.item) ?? 2.5) / 5;
      return { entry, score: (myItems.length ? affinity(entry.item) : 0) + quality };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ entry }) => entry);

  // Next up: best rated items still pending in my lists.
  const nextUp = myLists
    .flatMap(list => list.items.filter(item => !item.isWatched && item.category !== 'link').map(item => ({ item, list })))
    .sort(
      (a, b) =>
        (getListRating(b.item).average ?? getCriticRating(b.item) ?? 0) -
        (getListRating(a.item).average ?? getCriticRating(a.item) ?? 0)
    )
    .slice(0, 6);

  // Featured lists: public lists from others, by recent activity, size and contributors.
  const featuredLists = lists
    .filter(l => l.isPublic && l.owner.id !== userId && l.items.length > 0)
    .map(list => {
      const contributors = new Set(list.items.map(i => i.addedBy.id)).size;
      const recentAdds = list.items.filter(i => daysSince(i.addedAt, now) <= NEWS_WINDOW_DAYS).length;
      const score =
        Math.log1p(list.items.length) + 0.8 * Math.log1p(contributors) + Math.log1p(recentAdds) +
        Math.exp(-daysSince(list.updatedAt, now) / RECENCY_HALF_LIFE_DAYS);
      return { list, contributorsCount: contributors, recentAdds, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _score, ...rest }) => rest);

  const friendRecommendations = recommendations
    .filter(r => r.toUserId === userId)
    .sort((a, b) => Number(a.read) - Number(b.read) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return { news, trending, forYou, nextUp, friendRecommendations, featuredLists };
};
