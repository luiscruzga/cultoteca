export type StandardMediaCategory =
  | 'movie'
  | 'series'
  | 'book'
  | 'anime'
  | 'manga'
  | 'game'
  | 'boardgame'
  | 'podcast'
  | 'music'
  | 'recipe'
  | 'place'
  | 'link';
export type MediaCategory = StandardMediaCategory | (string & {});
/** Content types a list accepts: the standard categories plus 'other' (any manual/custom content). */
export type ListContentType = StandardMediaCategory | 'other';

export interface CustomCategory {
  id: string;
  label: string;
  icon?: string;
  createdAt: string;
}

export interface StreamingProvider {
  id: string;
  name: string;
  type: 'stream' | 'buy' | 'rent' | 'read' | 'borrow';
  logoUrl?: string;
  url?: string;
  color?: string;
}

export interface MediaComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  rating?: number;
  createdAt: string;
}

export interface ReleaseEpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  name?: string;
  airDate: string; // Formato "YYYY-MM-DD"
  overview?: string;
}

export interface ReleaseChapterInfo {
  chapterNumber: string;
  title?: string;
  publishAt: string; // Fecha ISO o "YYYY-MM-DD"
}

export interface ReleaseTrackingInfo {
  nextEpisode?: ReleaseEpisodeInfo;
  latestChapter?: ReleaseChapterInfo;
  status?: string; // ej. "Returning Series", "Ended", "releasing", "completed"
  notificationsEnabled?: boolean;
  scheduledNotificationId?: string;
  lastCheckedAt: string;
}

export interface CastMember {
  id?: number; // Id de persona en TMDB
  name: string;
  character?: string;
  profileUrl?: string;
}

export interface PersonDetails {
  id: number;
  name: string;
  profileUrl?: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  knownForDepartment?: string;
  tmdbUrl: string;
  credits: { item: MediaItem; character?: string }[];
}

export interface MediaItem {
  id: string;
  sourceId?: string; // Id original del proveedor (ej. "tmdb-movie-123"); identifica la obra entre listas
  title: string;
  originalTitle?: string;
  category: MediaCategory;
  year: number;
  releaseDate?: string; // Fecha completa de estreno o lanzamiento (ej. "2010-07-16")
  synopsis: string;
  posterUrl: string;
  backdropUrl?: string;
  genres: string[];
  cast?: string[]; // Elenco / Actores principales
  castMembers?: CastMember[]; // Reparto con ids y fotos de TMDB (películas y series)
  director?: string; // Director(a), creador(a) o autor(a)
  averageRating: number; // 0 to 5 (supports decimals e.g. 4.5)
  criticRating?: number; // Puntuación de la crítica/proveedor (0-5), no la alteran los votos de usuarios
  ratingsCount: number;
  whereToWatchOrRead: StreamingProvider[];
  externalLinks?: { label: string; url: string }[];
  url?: string; // URL directa para medios de tipo enlace
  siteName?: string; // Nombre del sitio o plataforma (ej. X, Instagram, YouTube)
  isManualEntry: boolean;
  isWatched?: boolean;
  watchedAt?: string;
  trackingInfo?: ReleaseTrackingInfo;
  addedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  addedAt: string;
  comments: MediaComment[];
  userRating?: number;
}

export interface ListInvitation {
  userId: string;
  userName: string;
  userAvatar?: string;
  userHandle?: string;
  invitedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  invitedAt: string;
}

export interface CollaborativeList {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  category: MediaCategory | 'all';
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
  collaborators: {
    id: string;
    name: string;
    avatar?: string;
    role: 'owner' | 'editor' | 'viewer';
  }[];
  pendingInvites?: ListInvitation[]; // Invitaciones directas pendientes de aceptar
  inviteCode: string;
  shareUrl?: string;
  isPublic: boolean;
  allowContributions?: boolean; // Permite o bloquea agregar ítems por terceros
  contributionPolicy?: 'collaborators_only' | 'anyone_logged_in'; // Solo invitados o cualquier usuario logeado
  allowedCategories?: ListContentType[]; // Tipos de contenido admitidos; ausente = todos
  items: MediaItem[];
  createdAt: string;
  updatedAt: string;
}

/** Usuario suscrito a una lista, con su rol de mayor prioridad (dueño > colaborador > publicó > seguidor). */
export interface ListMember {
  id: string;
  name: string;
  avatar?: string;
  handle?: string;
  userCode?: string;
  role: 'owner' | 'collaborator' | 'contributor' | 'follower';
  contributions: number; // Ítems añadidos + comentarios publicados en la lista
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: 'added_item' | 'commented' | 'rated' | 'joined_list' | 'won_roulette';
  targetTitle: string;
  targetCategory: MediaCategory;
  listTitle: string;
  timestamp: string;
  extra?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'cine' | 'anime' | 'lectura' | 'gaming' | 'social' | 'curador';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export interface UserProfile {
  id: string;
  clerkId?: string;
  email?: string;
  userCode: string; // Código único de usuario (ej. "#CULTO-4829")
  name: string;
  handle: string; // @handle
  avatar?: string;
  bio?: string;
  cultoScore: number;
  badges: Badge[];
  activeSubscriptions: string[]; // e.g. ['Netflix', 'Prime Video', 'Crunchyroll']
  friends?: string[]; // IDs o códigos de usuarios conectados
  followedLists?: string[]; // IDs de listas seguidas por el usuario
}

/** Obra marcada como vista por un usuario; se aplica en todas las listas donde aparezca. */
export interface WatchedEntry {
  userId?: string;
  workKey: string;
  sourceId?: string;
  title: string;
  category: MediaCategory;
  year?: number;
  watchedAt: string;
}

export interface FavoriteItem {
  id: string;
  mediaId: string;
  listId: string;
  listTitle: string;
  item: MediaItem;
  addedAt: string;
  userId?: string;
}

export interface DirectRecommendation {
  id: string;
  fromUser: {
    id: string;
    name: string;
    avatar?: string;
    handle?: string;
    userCode?: string;
  };
  toUserId: string;
  item: MediaItem;
  message?: string;
  read: boolean;
  addedToListId?: string;
  createdAt: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  apkUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
  mandatory?: boolean;
}

export interface UpdateConfig {
  autoUpdatesEnabled: boolean;
  lastCheckedTimestamp?: number;
}

export type ListActivityAction = 'item_added' | 'item_removed' | 'item_commented' | 'list_updated';

export interface ListActivityNotification {
  id: string;
  listId: string;
  listTitle: string;
  actor: {
    id: string;
    name: string;
    avatar?: string;
    handle?: string;
  };
  action: ListActivityAction;
  mediaItem?: MediaItem;
  mediaId?: string;
  mediaTitle?: string;
  mediaCategory?: MediaCategory;
  message?: string;
  read: boolean;
  createdAt: string;
  recipientUserId?: string;
}


