import { CollaborativeList, ListContentType, MediaCategory, StandardMediaCategory } from '../types';

export const LIST_CONTENT_TYPES: { key: ListContentType; label: string; emoji: string }[] = [
  { key: 'movie', label: 'Películas', emoji: '🎬' },
  { key: 'series', label: 'Series', emoji: '📺' },
  { key: 'anime', label: 'Anime', emoji: '⚡' },
  { key: 'manga', label: 'Manga', emoji: '📚' },
  { key: 'book', label: 'Libros', emoji: '📖' },
  { key: 'game', label: 'Videojuegos', emoji: '🎮' },
  { key: 'boardgame', label: 'Juegos de mesa', emoji: '🎲' },
  { key: 'podcast', label: 'Podcasts', emoji: '🎙️' },
  { key: 'music', label: 'Música', emoji: '🎵' },
  { key: 'recipe', label: 'Recetas', emoji: '🍳' },
  { key: 'place', label: 'Lugares', emoji: '📍' },
  { key: 'link', label: 'Enlaces', emoji: '🔗' },
  { key: 'other', label: 'Otros', emoji: '✨' },
];

export const ALL_LIST_CONTENT_TYPES: ListContentType[] = LIST_CONTENT_TYPES.map(t => t.key);

const STANDARD_CATEGORIES = new Set<string>(ALL_LIST_CONTENT_TYPES.filter(t => t !== 'other'));

/** Categories that are backed by a search provider (links and custom content are manual). */
const SEARCHABLE_CATEGORIES: StandardMediaCategory[] = [
  'movie', 'series', 'anime', 'manga', 'book', 'game', 'boardgame', 'podcast', 'music', 'recipe', 'place',
];

/** Allowed content types of a list; legacy lists without the field accept everything. */
export const getAllowedCategories = (list?: Pick<CollaborativeList, 'allowedCategories'> | null): ListContentType[] =>
  list?.allowedCategories?.length ? list.allowedCategories : ALL_LIST_CONTENT_TYPES;

export const allowsAllCategories = (allowed: ListContentType[]) =>
  ALL_LIST_CONTENT_TYPES.every(t => allowed.includes(t));

/** Custom (non-standard) categories count as 'other'. */
export const toListContentType = (category: MediaCategory): ListContentType =>
  STANDARD_CATEGORIES.has(category) ? (category as StandardMediaCategory) : 'other';

export const isCategoryAllowed = (
  list: Pick<CollaborativeList, 'allowedCategories'> | null | undefined,
  category: MediaCategory
): boolean => getAllowedCategories(list).includes(toListContentType(category));

export const getSearchableCategories = (allowed: ListContentType[]): StandardMediaCategory[] =>
  SEARCHABLE_CATEGORIES.filter(c => allowed.includes(c));

export const describeAllowedCategories = (allowed: ListContentType[]): string =>
  allowsAllCategories(allowed)
    ? 'Todo tipo de contenido'
    : LIST_CONTENT_TYPES.filter(t => allowed.includes(t.key)).map(t => t.label).join(', ');
