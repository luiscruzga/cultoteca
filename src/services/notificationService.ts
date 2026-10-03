import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { ListActivityNotification } from '../types';
import { MongoDbService } from './mongoDbService';

const appJson = require('../../app.json');

// expo-notifications throws when imported in Expo Go on Android (SDK 53+) and does nothing on web.
const isNotificationsSupported = Platform.OS !== 'web' && (!isRunningInExpoGo() || Platform.OS !== 'android');

export let Notifications: typeof import('expo-notifications') | null = null;
if (isNotificationsSupported) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.warn('[notificationService] Error cargando expo-notifications:', error);
  }
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const ANDROID_CHANNEL_ID = 'default';
const PUSH_TOKEN_KEY = '@cultoteca_push_token_v1';
const LAST_LOCAL_NOTIFIED_KEY = '@cultoteca_last_local_notified_v1';
const POLL_INTERVAL_MS = 60 * 1000;

export interface NotificationTarget {
  listId: string;
  mediaId?: string | null;
}

/**
 * Android 8+ needs a channel to display notifications, and Android 13+ only shows the
 * permission prompt once a channel exists.
 */
export const ensureAndroidChannel = async (): Promise<void> => {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Actividad de listas',
      description: 'Novedades de tus listas, listas seguidas y estrenos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38BDF8',
    });
  } catch (error) {
    console.warn('[notificationService] No se pudo crear el canal de Android:', error);
  }
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Notifications) return false;
  try {
    await ensureAndroidChannel();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('[notificationService] Error solicitando permisos de notificación:', error);
    return false;
  }
};

/**
 * Registers this device's Expo push token in the backend. Returns false when push is not
 * available (no permission, Expo Go, or missing FCM credentials on Android).
 */
export const registerForPushNotifications = async (): Promise<boolean> => {
  if (!Notifications || !MongoDbService.isConfigured()) return false;
  const granted = await requestNotificationPermissions();
  if (!granted) return false;
  try {
    const projectId: string | undefined = appJson?.expo?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const ok = await MongoDbService.registerPushToken(token, Platform.OS);
    if (ok) await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return ok;
  } catch (error) {
    // On Android this fails until google-services.json / FCM credentials are configured.
    console.warn('[notificationService] Push no disponible, se usarán notificaciones locales:', error);
    return false;
  }
};

export const unregisterPushToken = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    if (MongoDbService.isConfigured()) await MongoDbService.removePushToken(token);
  } catch (error) {
    console.warn('[notificationService] Error eliminando el token push:', error);
  }
};

const presentLocalNotification = async (notif: ListActivityNotification): Promise<void> => {
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📚 ${notif.listTitle}`,
      body: `${notif.actor.name} ${notif.message || 'actualizó la lista'}`,
      sound: 'default',
      data: { type: 'list_activity', listId: notif.listId, mediaId: notif.mediaId || notif.mediaItem?.id || null },
    },
    trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
  });
};

/**
 * Shows unread notifications newer than the last ones shown. The first run only records
 * the baseline so existing notifications are not replayed on a fresh install.
 */
export const presentNewLocalNotifications = async (notifs: ListActivityNotification[]): Promise<void> => {
  if (!Notifications) return;
  const newest = notifs.reduce((max, n) => (n.createdAt > max ? n.createdAt : max), '');
  try {
    const last = await AsyncStorage.getItem(LAST_LOCAL_NOTIFIED_KEY);
    if (newest) await AsyncStorage.setItem(LAST_LOCAL_NOTIFIED_KEY, newest > (last || '') ? newest : last || newest);
    if (!last) return;
    const fresh = notifs.filter(n => !n.read && n.createdAt > last).slice(0, 5);
    for (const notif of fresh.reverse()) await presentLocalNotification(notif);
  } catch (error) {
    console.warn('[notificationService] Error mostrando notificaciones locales:', error);
  }
};

/** Calls `onTap` when the user opens a list activity notification (also on cold start). */
export const subscribeToNotificationTaps = (onTap: (target: NotificationTarget) => void): (() => void) => {
  if (!Notifications) return () => {};
  const handle = (data: Record<string, unknown> | undefined) => {
    if (data && typeof data.listId === 'string') {
      onTap({ listId: data.listId, mediaId: typeof data.mediaId === 'string' ? data.mediaId : null });
    }
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(response =>
    handle(response.notification.request.content.data)
  );
  // Cold start: the app was opened by tapping a notification. Clear it so it is handled once.
  const lastResponse = Notifications.getLastNotificationResponse();
  if (lastResponse) {
    Notifications.clearLastNotificationResponse();
    handle(lastResponse.notification.request.content.data);
  }
  return () => subscription.remove();
};

/** Runs `poll` periodically and whenever the app returns to the foreground. */
export const startNotificationPolling = (poll: () => void): (() => void) => {
  const interval = setInterval(poll, POLL_INTERVAL_MS);
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') poll();
  });
  return () => {
    clearInterval(interval);
    subscription.remove();
  };
};
