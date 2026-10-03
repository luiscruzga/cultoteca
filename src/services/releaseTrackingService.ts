import { Platform } from 'react-native';
import { MediaItem, ReleaseEpisodeInfo, ReleaseChapterInfo, ReleaseTrackingInfo } from '../types';
import { fetchTvShowNextEpisode } from './api/tmdbService';
import { fetchMangaLatestChapter } from './api/mangaDexService';
import { ANDROID_CHANNEL_ID, Notifications, requestNotificationPermissions } from './notificationService';

// expo-notifications se carga de forma segura (ni Expo Go Android ni web) en notificationService
export { requestNotificationPermissions };

/**
 * Extrae el ID numérico de TMDB de un ítem de tipo serie
 */
export const extractTmdbTvId = (item: MediaItem): number | null => {
  if (item.category !== 'series') return null;

  // Busca patrones como "tmdb-tv-1234", "tmdb-series-1234" o números directos
  const match = item.id.match(/^tmdb-(?:tv|series)-(\d+)$/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  // Si el ID es numérico puro
  const directNum = parseInt(item.id, 10);
  if (!isNaN(directNum) && directNum > 0) {
    return directNum;
  }

  // Busca en enlaces externos de TMDB
  if (item.externalLinks) {
    const tmdbLink = item.externalLinks.find(link => link.url && link.url.includes('themoviedb.org/tv/'));
    if (tmdbLink) {
      const urlMatch = tmdbLink.url.match(/\/tv\/(\d+)/);
      if (urlMatch && urlMatch[1]) {
        return parseInt(urlMatch[1], 10);
      }
    }
  }

  return null;
};

/**
 * Extrae el UUID de MangaDex de un ítem de tipo manga
 */
export const extractMangaDexId = (item: MediaItem): string | null => {
  if (item.category !== 'manga') return null;

  if (item.id.startsWith('mangadex-')) {
    return item.id.replace(/^mangadex-/, '');
  }

  // Busca en enlaces externos de MangaDex
  if (item.externalLinks) {
    const mdLink = item.externalLinks.find(link => link.url && link.url.includes('mangadex.org/title/'));
    if (mdLink) {
      const urlMatch = mdLink.url.match(/\/title\/([a-zA-Z0-9-]+)/);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
    }
  }

  // Verifica si el id parece un UUID (36 chars con guiones)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
    return item.id;
  }

  return null;
};

/**
 * Consulta la fuente de datos oficial y actualiza el trackingInfo de un ítem
 */
export const fetchItemReleaseTracking = async (
  item: MediaItem
): Promise<ReleaseTrackingInfo | null> => {
  const currentTracking = item.trackingInfo || { lastCheckedAt: new Date().toISOString() };

  if (item.category === 'series') {
    const tvId = extractTmdbTvId(item);
    if (!tvId) return null;

    const result = await fetchTvShowNextEpisode(tvId);
    if (!result) return currentTracking;

    return {
      ...currentTracking,
      nextEpisode: result.nextEpisode,
      status: result.status,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  if (item.category === 'manga') {
    const mangaId = extractMangaDexId(item);
    if (!mangaId) return null;

    const result = await fetchMangaLatestChapter(mangaId);
    if (!result) return currentTracking;

    return {
      ...currentTracking,
      latestChapter: result.latestChapter,
      status: result.status,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  return null;
};

/**
 * Programa una notificación local en el dispositivo para la fecha del próximo episodio
 */
export const scheduleEpisodeNotification = async (
  item: MediaItem,
  episodeInfo: ReleaseEpisodeInfo
): Promise<string | undefined> => {
  const notif = Notifications;
  if (!notif || Platform.OS === 'web') return undefined;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return undefined;

  try {
    // Si ya existía una notificación agendada, la cancelamos primero
    if (item.trackingInfo?.scheduledNotificationId) {
      await cancelReleaseNotification(item.trackingInfo.scheduledNotificationId);
    }

    // Calcular fecha objetivo: 09:00 AM del día del estreno
    const [year, month, day] = episodeInfo.airDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day, 9, 0, 0);

    // Si la fecha ya expiró en el pasado, no se agenda
    if (targetDate.getTime() <= Date.now()) {
      return undefined;
    }

    const titleText = `🎬 ¡Nuevo episodio de ${item.title}!`;
    const episodeTitle = episodeInfo.name ? `: "${episodeInfo.name}"` : '';
    const bodyText = `Hoy se estrena la Temporada ${episodeInfo.seasonNumber}, Episodio ${episodeInfo.episodeNumber}${episodeTitle}.`;

    const dateTriggerType = notif.SchedulableTriggerInputTypes?.DATE ?? ('date' as any);

    const notificationId = await notif.scheduleNotificationAsync({
      content: {
        title: titleText,
        body: bodyText,
        data: {
          itemId: item.id,
          title: item.title,
          category: item.category,
          airDate: episodeInfo.airDate,
        },
      },
      trigger: {
        type: dateTriggerType,
        date: targetDate,
        channelId: ANDROID_CHANNEL_ID,
      },
    });

    return notificationId;
  } catch (error) {
    console.warn(`Error agendando notificación para ${item.title}:`, error);
    return undefined;
  }
};

/**
 * Cancela una notificación local programada
 */
export const cancelReleaseNotification = async (notificationId?: string): Promise<void> => {
  const notif = Notifications;
  if (!notificationId || !notif || Platform.OS === 'web') return;

  try {
    await notif.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn(`Error cancelando notificación ${notificationId}:`, error);
  }
};

/**
 * Genera un texto amigable y legible para mostrar en las tarjetas y vista de detalle
 */
export const formatReleaseBadge = (
  item: MediaItem
): { label: string; date?: string; isUpcoming: boolean; isEnded?: boolean } | null => {
  const tracking = item.trackingInfo;

  if (item.category === 'series') {
    if (tracking?.nextEpisode?.airDate) {
      const ep = tracking.nextEpisode;
      const [year, month, day] = ep.airDate.split('-').map(Number);
      const epDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isToday = epDate.getTime() === today.getTime();
      const isPast = epDate.getTime() < today.getTime();

      const formattedDate = epDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });

      if (isToday) {
        return {
          label: `¡Hoy! T${ep.seasonNumber}:E${ep.episodeNumber}`,
          date: ep.airDate,
          isUpcoming: true,
        };
      }

      if (isPast) {
        return {
          label: `Emitido T${ep.seasonNumber}:E${ep.episodeNumber}`,
          date: ep.airDate,
          isUpcoming: false,
        };
      }

      return {
        label: `T${ep.seasonNumber}:E${ep.episodeNumber} • ${formattedDate}`,
        date: ep.airDate,
        isUpcoming: true,
      };
    }

    if (tracking?.status === 'Ended' || tracking?.status === 'Canceled') {
      return {
        label: 'Finalizada',
        isUpcoming: false,
        isEnded: true,
      };
    }
  }

  if (item.category === 'manga' && tracking?.latestChapter) {
    const ch = tracking.latestChapter;
    let formattedDate = '';
    if (ch.publishAt) {
      const pubDate = new Date(ch.publishAt);
      if (!isNaN(pubDate.getTime())) {
        formattedDate = ` • ${pubDate.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
        })}`;
      }
    }

    return {
      label: `Cap. ${ch.chapterNumber}${formattedDate}`,
      date: ch.publishAt,
      isUpcoming: false,
    };
  }

  return null;
};
