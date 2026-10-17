import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CollaborativeList, MediaItem } from '../types';
import { ANDROID_CHANNEL_ID, Notifications, requestNotificationPermissions } from './notificationService';
import { formatEventDateShort } from '../utils/eventDates';

/**
 * Recordatorios personales de eventos: cada usuario elige cuándo avisarle antes de un evento y se
 * programan notificaciones locales en su dispositivo (no se sincronizan entre dispositivos ni miembros).
 */

const STORAGE_KEY = '@cultoteca_event_reminders_v1';

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
export const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

export interface ReminderPreset {
  minutes: number;
  label: string;
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  { minutes: MINUTES_PER_HOUR, label: '1 hora antes' },
  { minutes: 2 * MINUTES_PER_HOUR, label: '2 horas antes' },
  { minutes: MINUTES_PER_DAY, label: '1 día antes' },
  { minutes: 2 * MINUTES_PER_DAY, label: '2 días antes' },
  { minutes: MINUTES_PER_WEEK, label: '1 semana antes' },
];

export const DEFAULT_REMINDER_OFFSETS: number[] = [MINUTES_PER_DAY];

export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export const REMINDER_UNITS: { key: ReminderUnit; label: string; minutes: number }[] = [
  { key: 'minutes', label: 'minutos', minutes: 1 },
  { key: 'hours', label: 'horas', minutes: MINUTES_PER_HOUR },
  { key: 'days', label: 'días', minutes: MINUTES_PER_DAY },
  { key: 'weeks', label: 'semanas', minutes: MINUTES_PER_WEEK },
];

interface StoredReminder {
  offsetsMinutes: number[];
  notificationIds: string[];
  eventStartsAt: string;
}
type ReminderStore = Record<string, Record<string, StoredReminder>>;

/** "1 día antes", "3 semanas antes", "45 min antes"… */
export const formatReminderOffset = (minutes: number): string => {
  const unit = [...REMINDER_UNITS].reverse().find(u => minutes % u.minutes === 0 && minutes >= u.minutes) ?? REMINDER_UNITS[0];
  const amount = minutes / unit.minutes;
  const singular: Record<ReminderUnit, string> = { minutes: 'minuto', hours: 'hora', days: 'día', weeks: 'semana' };
  return `${amount} ${amount === 1 ? singular[unit.key] : unit.label} antes`;
};

const readStore = async (): Promise<ReminderStore> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReminderStore) : {};
  } catch {
    return {};
  }
};

const writeStore = async (store: ReminderStore): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('[eventReminders] No se pudo guardar:', error);
  }
};

export const canScheduleReminders = (): boolean => Boolean(Notifications) && Platform.OS !== 'web';

/** Selección guardada del usuario para el evento, o la selección por defecto si nunca la cambió. */
export const getEventReminderOffsets = async (userId: string, itemId: string): Promise<number[]> => {
  const store = await readStore();
  return store[userId]?.[itemId]?.offsetsMinutes ?? DEFAULT_REMINDER_OFFSETS;
};

export const hasStoredEventReminders = async (userId: string, itemId: string): Promise<boolean> => {
  const store = await readStore();
  return Boolean(store[userId]?.[itemId]);
};

const cancelNotifications = async (ids: string[]): Promise<void> => {
  if (!Notifications || ids.length === 0) return;
  await Promise.all(
    ids.map(id => Notifications!.cancelScheduledNotificationAsync(id).catch(() => undefined))
  );
};

/**
 * Guarda la selección del usuario y (re)programa una notificación local por cada recordatorio futuro.
 * Devuelve cuántas notificaciones quedaron programadas (0 en web o sin permiso; la selección se guarda igual).
 */
export const setEventReminders = async (
  userId: string,
  item: Pick<MediaItem, 'id' | 'title' | 'eventStartsAt' | 'eventAllDay' | 'eventLocation'>,
  offsetsMinutes: number[],
  listId?: string
): Promise<{ scheduled: number }> => {
  const offsets = Array.from(new Set(offsetsMinutes.filter(m => Number.isFinite(m) && m > 0))).sort((a, b) => a - b);
  const store = await readStore();
  const previous = store[userId]?.[item.id];
  await cancelNotifications(previous?.notificationIds ?? []);

  const notificationIds: string[] = [];
  const startsAt = item.eventStartsAt ? new Date(item.eventStartsAt) : null;

  if (startsAt && !isNaN(startsAt.getTime()) && canScheduleReminders() && (await requestNotificationPermissions())) {
    const notif = Notifications!;
    const dateTriggerType = notif.SchedulableTriggerInputTypes?.DATE ?? ('date' as any);
    for (const minutes of offsets) {
      const fireAt = new Date(startsAt.getTime() - minutes * 60 * 1000);
      if (fireAt.getTime() <= Date.now()) continue;
      try {
        const id = await notif.scheduleNotificationAsync({
          content: {
            title: `📅 ${item.title}`,
            body: `Empieza ${formatReminderOffset(minutes).replace(' antes', '')} después de este aviso: ${formatEventDateShort(item.eventStartsAt!, item.eventAllDay)}${item.eventLocation ? ` · ${item.eventLocation}` : ''}`,
            data: { listId: listId ?? null, mediaId: item.id, eventReminder: true },
          },
          trigger: { type: dateTriggerType, date: fireAt, channelId: ANDROID_CHANNEL_ID },
        });
        notificationIds.push(id);
      } catch (error) {
        console.warn(`[eventReminders] No se pudo programar el aviso de ${item.title}:`, error);
      }
    }
  }

  store[userId] = { ...(store[userId] ?? {}), [item.id]: { offsetsMinutes: offsets, notificationIds, eventStartsAt: item.eventStartsAt ?? '' } };
  await writeStore(store);
  return { scheduled: notificationIds.length };
};

/** Cancela y olvida los recordatorios del usuario para un evento (p. ej. al eliminarlo de la lista). */
export const cancelEventReminders = async (userId: string, itemId: string): Promise<void> => {
  const store = await readStore();
  const entry = store[userId]?.[itemId];
  if (!entry) return;
  await cancelNotifications(entry.notificationIds);
  delete store[userId][itemId];
  await writeStore(store);
};

/** Reprograma, con los mismos minutos, los avisos guardados de un evento cuya fecha cambió. */
export const rescheduleEventReminders = async (
  userId: string,
  item: Pick<MediaItem, 'id' | 'title' | 'eventStartsAt' | 'eventAllDay' | 'eventLocation'>,
  listId?: string
): Promise<void> => {
  const store = await readStore();
  const entry = store[userId]?.[item.id];
  if (!entry || entry.eventStartsAt === (item.eventStartsAt ?? '')) return;
  await setEventReminders(userId, item, entry.offsetsMinutes, listId);
};

/**
 * Alinea los avisos guardados con las listas cargadas: cancela los de eventos que ya no existen y
 * reprograma los de eventos cuya fecha cambió (p. ej. editada por quien lo publicó).
 */
export const syncEventReminders = async (userId: string, lists: CollaborativeList[]): Promise<void> => {
  const store = await readStore();
  const entries = store[userId];
  if (!entries || Object.keys(entries).length === 0) return;
  const found = new Map<string, { item: MediaItem; listId: string }>();
  for (const list of lists) {
    for (const item of list.items) {
      if (item.category === 'event' && !found.has(item.id)) found.set(item.id, { item, listId: list.id });
    }
  }
  for (const [itemId, entry] of Object.entries(entries)) {
    const match = found.get(itemId);
    try {
      if (!match) {
        await cancelEventReminders(userId, itemId);
      } else if ((match.item.eventStartsAt ?? '') !== entry.eventStartsAt) {
        await setEventReminders(userId, match.item, entry.offsetsMinutes, match.listId);
      }
    } catch (error) {
      console.warn(`[eventReminders] No se pudo sincronizar el evento ${itemId}:`, error);
    }
  }
};
