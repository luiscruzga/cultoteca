import { Badge, CollaborativeList, UserProfile } from '../types';

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

export const CULTO_POINTS = {
  ADD_MEDIA: 15,
  MARK_WATCHED: 20,
  ADD_COMMENT: 10,
  CREATE_LIST: 25,
  SPIN_ROULETTE: 10,
  CONNECT_FRIEND: 15,
};

export const DEFAULT_BADGES_CATALOG: Badge[] = [
  {
    id: 'b-cinefilo',
    title: 'Cinéfilo de Culto',
    description: 'Comparte o califica más de 10 películas o series de culto',
    icon: 'film',
    category: 'cine',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: 'b-otaku',
    title: 'Otaku Supremo',
    description: 'Agrega mangas o animes a listas compartidas con amigos',
    icon: 'flash',
    category: 'anime',
    unlocked: false,
    progress: 0,
    maxProgress: 8,
  },
  {
    id: 'b-lector',
    title: 'Devorador de Páginas',
    description: 'Crea o colabora en listas literarias con recomendaciones',
    icon: 'book',
    category: 'lectura',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'b-gamer',
    title: 'Gamer de Culto',
    description: 'Guarda o califica videojuegos de culto en listas compartidas',
    icon: 'game-controller',
    category: 'gaming',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'b-curador',
    title: 'Curador Colaborativo',
    description: 'Ten al menos 3 amigos colaborando en una misma lista',
    icon: 'people',
    category: 'curador',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: 'b-nocturno',
    title: 'Maratón Cultural',
    description: 'Marca al menos 5 obras como vistas o completadas',
    icon: 'moon',
    category: 'cine',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'b-critico',
    title: 'Crítico Afilado',
    description: 'Escribe al menos 3 opiniones o comentarios en obras de listas',
    icon: 'chatbubble-ellipses',
    category: 'social',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: 'b-ruleta',
    title: 'Ruleta de la Fortuna',
    description: 'Usa la ruleta cultural para decidir qué ver hoy',
    icon: 'dice',
    category: 'social',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'b-social',
    title: 'Conector Cultural',
    description: 'Conecta con 3 o más amigos en la comunidad de Cultoteca',
    icon: 'person-add',
    category: 'social',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: 'b-coleccionista',
    title: 'Gran Coleccionista',
    description: 'Añade 15 o más obras a través de tus distintas listas',
    icon: 'albums',
    category: 'curador',
    unlocked: false,
    progress: 0,
    maxProgress: 15,
  },
];

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

  calculateCultoScore(lists: CollaborativeList[], userId: string, extraPoints: number = 0): number {
    let score = 100 + extraPoints; // Base score + bonus actions

    lists.forEach(list => {
      // 20 points for each collaborative list created or joined
      score += 20;

      list.items.forEach(item => {
        // 15 points for each item added by the user
        if (item.addedBy.id === userId) {
          score += 15;
        }

        // 10 points if item was marked as watched/completed
        if (item.isWatched && item.addedBy.id === userId) {
          score += 10;
        }

        // 8 points for each comment left
        item.comments.forEach(comment => {
          if (comment.userId === userId) {
            score += 8;
          }
        });
      });
    });

    return score;
  },

  updateBadges(
    currentBadges: Badge[] = [],
    lists: CollaborativeList[],
    userId: string,
    profileFriendsCount: number = 0,
    rouletteSpun: boolean = false
  ): Badge[] {
    let movieCount = 0;
    let animeCount = 0;
    let bookCount = 0;
    let gameCount = 0;
    let totalItemsAdded = 0;
    let watchedCount = 0;
    let commentsCount = 0;
    const totalCollaboratorsMet = new Set<string>();

    lists.forEach(list => {
      list.collaborators.forEach(c => {
        if (c.id !== userId) {
          totalCollaboratorsMet.add(c.id);
        }
      });

      list.items.forEach(item => {
        if (item.addedBy.id === userId) {
          totalItemsAdded++;
          if (item.category === 'movie' || item.category === 'series') movieCount++;
          if (item.category === 'anime' || item.category === 'manga') animeCount++;
          if (item.category === 'book') bookCount++;
          if (item.category === 'game') gameCount++;
          if (item.isWatched) watchedCount++;
        }

        item.comments.forEach(c => {
          if (c.userId === userId) commentsCount++;
        });
      });
    });

    // Merge existing badges with catalog to ensure new badges appear
    const mergedBadges = DEFAULT_BADGES_CATALOG.map(catalogBadge => {
      const existing = currentBadges.find(b => b.id === catalogBadge.id);
      return existing || { ...catalogBadge };
    });

    return mergedBadges.map(b => {
      let progress = b.progress;

      if (b.id === 'b-cinefilo') {
        progress = Math.min(movieCount, b.maxProgress);
      } else if (b.id === 'b-otaku') {
        progress = Math.min(animeCount, b.maxProgress);
      } else if (b.id === 'b-lector') {
        progress = Math.min(bookCount, b.maxProgress);
      } else if (b.id === 'b-gamer') {
        progress = Math.min(gameCount, b.maxProgress);
      } else if (b.id === 'b-curador') {
        progress = Math.min(totalCollaboratorsMet.size, b.maxProgress);
      } else if (b.id === 'b-nocturno') {
        progress = Math.min(watchedCount, b.maxProgress);
      } else if (b.id === 'b-critico') {
        progress = Math.min(commentsCount, b.maxProgress);
      } else if (b.id === 'b-ruleta') {
        progress = rouletteSpun || b.unlocked ? 1 : 0;
      } else if (b.id === 'b-social') {
        progress = Math.min(profileFriendsCount, b.maxProgress);
      } else if (b.id === 'b-coleccionista') {
        progress = Math.min(totalItemsAdded, b.maxProgress);
      }

      const unlocked = b.unlocked || progress >= b.maxProgress;
      return { ...b, progress, unlocked };
    });
  },
};
