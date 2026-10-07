import { Badge, CollaborativeList, GamificationCounters, WatchedEntry } from '../types';

export interface CultoRank {
  level: number;
  title: string;
  minScore: number;
  nextScore: number | null;
  progressPercent: number;
  icon: string;
  badgeColor: string;
  description: string;
}

/** Única tabla de puntos: la usan el cálculo y la guía del modal de rango. */
export const CULTO_POINTS = {
  BASE: 100,
  CREATE_LIST: 25,
  JOIN_LIST: 15,
  ADD_MEDIA: 15,
  MARK_WATCHED: 20,
  ADD_COMMENT: 10,
  ADD_FAVORITE: 5,
  FOLLOW_LIST: 5,
  CONNECT_FRIEND: 15,
  SETUP_PLATFORMS: 20,
  SPIN_ROULETTE: 10,
  SHARE_ITEM: 10,
  OPEN_PLATFORM: 5,
  MISSION_COMPLETED: 30,
};

/** Máximo de eventos puntuales que suman puntos, para que repetirlos no infle el puntaje. */
export const COUNTER_CAP = 20;

export const POINTS_GUIDE: { points: number; label: string }[] = [
  { points: CULTO_POINTS.ADD_MEDIA, label: 'Agregar obra a una lista' },
  { points: CULTO_POINTS.MARK_WATCHED, label: 'Marcar obra como vista' },
  { points: CULTO_POINTS.ADD_COMMENT, label: 'Comentar o calificar' },
  { points: CULTO_POINTS.CREATE_LIST, label: 'Crear una lista' },
  { points: CULTO_POINTS.JOIN_LIST, label: 'Unirte a una lista' },
  { points: CULTO_POINTS.CONNECT_FRIEND, label: 'Conectar con un amigo' },
  { points: CULTO_POINTS.SHARE_ITEM, label: 'Compartir obra a otra lista' },
  { points: CULTO_POINTS.SPIN_ROULETTE, label: 'Girar la ruleta de culto' },
  { points: CULTO_POINTS.ADD_FAVORITE, label: 'Marcar un favorito' },
  { points: CULTO_POINTS.FOLLOW_LIST, label: 'Seguir una lista pública' },
  { points: CULTO_POINTS.OPEN_PLATFORM, label: 'Abrir obra en su plataforma' },
  { points: CULTO_POINTS.SETUP_PLATFORMS, label: 'Configurar tus plataformas' },
  { points: CULTO_POINTS.MISSION_COMPLETED, label: 'Completar una misión' },
];

/** Todo lo que determina puntaje y misiones; el resultado es derivado, nunca acumulado. */
export interface GamificationInput {
  userId: string;
  lists: CollaborativeList[];
  watched: WatchedEntry[];
  favoritesCount: number;
  followedListsCount: number;
  friendsCount: number;
  subscriptionsCount: number;
  counters?: GamificationCounters;
}

const badge = (
  id: string,
  title: string,
  description: string,
  icon: string,
  category: Badge['category'],
  maxProgress: number
): Badge => ({ id, title, description, icon, category, unlocked: false, progress: 0, maxProgress });

export const DEFAULT_BADGES_CATALOG: Badge[] = [
  badge('b-cinefilo', 'Cinéfilo de Culto', 'Agrega 10 películas o series a tus listas', 'film', 'cine', 10),
  badge('b-otaku', 'Otaku Supremo', 'Agrega 8 mangas o animes a listas compartidas', 'flash', 'anime', 8),
  badge('b-lector', 'Devorador de Páginas', 'Agrega 5 libros a tus listas', 'book', 'lectura', 5),
  badge('b-gamer', 'Gamer de Culto', 'Guarda 5 videojuegos en listas compartidas', 'game-controller', 'gaming', 5),
  badge('b-curador', 'Curador Colaborativo', 'Coincide con 3 personas distintas en tus listas', 'people', 'curador', 3),
  badge('b-nocturno', 'Maratón Cultural', 'Marca 5 obras como vistas', 'moon', 'cine', 5),
  badge('b-maratonista', 'Maratonista Legendario', 'Marca 25 obras como vistas', 'flame', 'cine', 25),
  badge('b-ecletico', 'Paladar Ecléctico', 'Marca como vistas obras de 4 categorías distintas', 'color-palette', 'explorador', 4),
  badge('b-critico', 'Crítico Afilado', 'Escribe 3 opiniones o comentarios en obras', 'chatbubble-ellipses', 'social', 3),
  badge('b-resenista', 'Reseñista de Culto', 'Califica con estrellas 10 obras', 'star', 'social', 10),
  badge('b-ruleta', 'Ruleta de la Fortuna', 'Usa la ruleta cultural para decidir qué ver', 'dice', 'social', 1),
  badge('b-ruleta-pro', 'Fiel a la Ruleta', 'Gira la ruleta 10 veces', 'sync', 'social', 10),
  badge('b-social', 'Conector Cultural', 'Conecta con 3 o más amigos', 'person-add', 'social', 3),
  badge('b-coleccionista', 'Gran Coleccionista', 'Añade 15 obras a través de tus listas', 'albums', 'curador', 15),
  badge('b-anfitrion', 'Anfitrión Cultural', 'Crea 3 listas propias', 'add-circle', 'curador', 3),
  badge('b-equipo', 'Espíritu de Equipo', 'Únete a 2 listas como colaborador', 'hand-left', 'social', 2),
  badge('b-favoritos', 'Corazón de Culto', 'Marca 5 obras como favoritas', 'heart', 'curador', 5),
  badge('b-difusor', 'Difusor Cultural', 'Comparte 3 obras a otras de tus listas', 'share-social', 'social', 3),
  badge('b-seguidor', 'Radar de Listas', 'Sigue 3 listas públicas', 'compass', 'explorador', 3),
  badge('b-plataformas', 'Streaming Configurado', 'Configura al menos 2 plataformas en tu perfil', 'tv', 'explorador', 2),
  badge('b-explorador', 'Directo a la Butaca', 'Abre 5 obras directamente en su plataforma', 'open', 'explorador', 5),
];

export interface GamificationResult {
  score: number;
  badges: Badge[];
}

export const GamificationService = {
  getCultoRank(score: number): CultoRank {
    if (score < 200) {
      const min = 0;
      const next = 200;
      const progressPercent = Math.min(Math.round((score / next) * 100), 100);
      return {
        level: 1,
        title: 'Novato Cultural',
        minScore: min,
        nextScore: next,
        progressPercent,
        icon: 'leaf-outline',
        badgeColor: '#94A3B8',
        description: 'Dando los primeros pasos en el universo del cine, literatura y arte.',
      };
    }
    if (score < 400) {
      const min = 200;
      const next = 400;
      const progressPercent = Math.min(Math.round(((score - min) / (next - min)) * 100), 100);
      return {
        level: 2,
        title: 'Aficionado de Culto',
        minScore: min,
        nextScore: next,
        progressPercent,
        icon: 'sparkles-outline',
        badgeColor: '#38BDF8',
        description: 'Desarrollando un paladar selecto para obras memorables con amigos.',
      };
    }
    if (score < 700) {
      const min = 400;
      const next = 700;
      const progressPercent = Math.min(Math.round(((score - min) / (next - min)) * 100), 100);
      return {
        level: 3,
        title: 'Curador Apasionado',
        minScore: min,
        nextScore: next,
        progressPercent,
        icon: 'ribbon-outline',
        badgeColor: '#A855F7',
        description: 'Referente cultural y curador activo que une comunidades.',
      };
    }
    if (score < 1000) {
      const min = 700;
      const next = 1000;
      const progressPercent = Math.min(Math.round(((score - min) / (next - min)) * 100), 100);
      return {
        level: 4,
        title: 'Erudito del Séptimo Arte',
        minScore: min,
        nextScore: next,
        progressPercent,
        icon: 'school-outline',
        badgeColor: '#F59E0B',
        description: 'Criterio analítico indiscutible con amplio bagaje multicultural.',
      };
    }
    return {
      level: 5,
      title: 'Maestro del Culto',
      minScore: 1000,
      nextScore: null,
      progressPercent: 100,
      icon: 'trophy',
      badgeColor: '#10B981',
      description: 'Leyenda viviente de la curaduría y el arte de culto.',
    };
  },

  /** Calcula puntaje y misiones a partir de la actividad real; las misiones desbloqueadas se conservan. */
  evaluate(input: GamificationInput, currentBadges: Badge[] = []): GamificationResult {
    const { userId, lists, watched, counters = {} } = input;
    let ownedLists = 0;
    let joinedLists = 0;
    let movieCount = 0;
    let animeCount = 0;
    let bookCount = 0;
    let gameCount = 0;
    let itemsAdded = 0;
    let commentsCount = 0;
    let ratingsCount = 0;
    const peopleMet = new Set<string>();

    lists.forEach(list => {
      const isOwner = list.owner.id === userId;
      const isCollaborator = !isOwner && list.collaborators.some(c => c.id === userId);
      if (isOwner) ownedLists++;
      if (isCollaborator) joinedLists++;
      if (isOwner || isCollaborator) {
        list.collaborators.forEach(c => {
          if (c.id !== userId) peopleMet.add(c.id);
        });
      }

      list.items.forEach(item => {
        if (item.addedBy.id === userId) {
          itemsAdded++;
          if (item.category === 'movie' || item.category === 'series') movieCount++;
          if (item.category === 'anime' || item.category === 'manga') animeCount++;
          if (item.category === 'book') bookCount++;
          if (item.category === 'game') gameCount++;
        }
        item.comments.forEach(c => {
          if (c.userId !== userId) return;
          commentsCount++;
          if (c.rating && c.rating > 0) ratingsCount++;
        });
      });
    });

    const watchedCount = watched.length;
    const watchedCategories = new Set(watched.map(w => w.category)).size;
    const capped = (n?: number) => Math.min(n ?? 0, COUNTER_CAP);
    const spins = counters.rouletteSpins ?? 0;
    const shared = counters.itemsShared ?? 0;
    const opens = counters.platformOpens ?? 0;

    const progressById: Record<string, number> = {
      'b-cinefilo': movieCount,
      'b-otaku': animeCount,
      'b-lector': bookCount,
      'b-gamer': gameCount,
      'b-curador': peopleMet.size,
      'b-nocturno': watchedCount,
      'b-maratonista': watchedCount,
      'b-ecletico': watchedCategories,
      'b-critico': commentsCount,
      'b-resenista': ratingsCount,
      'b-ruleta': spins,
      'b-ruleta-pro': spins,
      'b-social': input.friendsCount,
      'b-coleccionista': itemsAdded,
      'b-anfitrion': ownedLists,
      'b-equipo': joinedLists,
      'b-favoritos': input.favoritesCount,
      'b-difusor': shared,
      'b-seguidor': input.followedListsCount,
      'b-plataformas': input.subscriptionsCount,
      'b-explorador': opens,
    };

    const badges = DEFAULT_BADGES_CATALOG.map(catalogBadge => {
      const existing = currentBadges.find(b => b.id === catalogBadge.id);
      const progress = Math.min(progressById[catalogBadge.id] ?? 0, catalogBadge.maxProgress);
      return {
        ...catalogBadge,
        progress,
        unlocked: Boolean(existing?.unlocked) || progress >= catalogBadge.maxProgress,
      };
    });

    const P = CULTO_POINTS;
    const score =
      P.BASE +
      ownedLists * P.CREATE_LIST +
      joinedLists * P.JOIN_LIST +
      itemsAdded * P.ADD_MEDIA +
      watchedCount * P.MARK_WATCHED +
      commentsCount * P.ADD_COMMENT +
      input.favoritesCount * P.ADD_FAVORITE +
      input.followedListsCount * P.FOLLOW_LIST +
      input.friendsCount * P.CONNECT_FRIEND +
      (input.subscriptionsCount > 0 ? P.SETUP_PLATFORMS : 0) +
      capped(spins) * P.SPIN_ROULETTE +
      capped(shared) * P.SHARE_ITEM +
      capped(opens) * P.OPEN_PLATFORM +
      badges.filter(b => b.unlocked).length * P.MISSION_COMPLETED;

    return { score, badges };
  },
};
