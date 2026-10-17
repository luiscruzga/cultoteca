/**
 * Reconocimiento de fechas de eventos en texto libre (español e inglés) y formateadores de fecha
 * para los ítems de tipo evento.
 */

export interface DetectedEventDate {
  /** Fecha en ISO (UTC); la hora es 00:00 local cuando no se reconoció ninguna. */
  iso: string;
  hasTime: boolean;
}

const MONTHS: Record<string, number> = {
  enero: 0, ene: 0, january: 0, jan: 0,
  febrero: 1, feb: 1, february: 1,
  marzo: 2, mar: 2, march: 2,
  abril: 3, abr: 3, april: 3, apr: 3,
  mayo: 4, may: 4,
  junio: 5, jun: 5, june: 5,
  julio: 6, jul: 6, july: 6,
  agosto: 7, ago: 7, august: 7, aug: 7,
  septiembre: 8, setiembre: 8, sep: 8, sept: 8, set: 8, september: 8,
  octubre: 9, oct: 9, october: 9,
  noviembre: 10, nov: 10, november: 10,
  diciembre: 11, dic: 11, december: 11, dec: 11,
};
const MONTH_ALT = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|');

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

const TIME_RE = /\b(\d{1,2})(?:[:.h](\d{2}))?\s*(?:(a\.?m\.?|p\.?m\.?)|(h|hrs|hs)\b)/gi;
const TIME_COLON_RE = /\b(\d{1,2}):(\d{2})\b/g;

/** Busca una hora cerca (tras) de la fecha, o en cualquier parte del texto. */
const findTime = (text: string, from: number): { h: number; m: number } | null => {
  const candidates: { index: number; h: number; m: number }[] = [];
  const push = (index: number, h: number, m: number, meridiem?: string) => {
    if (meridiem) {
      const pm = meridiem.toLowerCase().startsWith('p');
      if (h === 12) h = pm ? 12 : 0;
      else if (pm) h += 12;
    }
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) candidates.push({ index, h, m });
  };
  let match: RegExpExecArray | null;
  TIME_RE.lastIndex = 0;
  while ((match = TIME_RE.exec(text)) !== null) {
    push(match.index, parseInt(match[1], 10), match[2] ? parseInt(match[2], 10) : 0, match[3]);
  }
  TIME_COLON_RE.lastIndex = 0;
  while ((match = TIME_COLON_RE.exec(text)) !== null) {
    push(match.index, parseInt(match[1], 10), parseInt(match[2], 10));
  }
  if (candidates.length === 0) return null;
  const after = candidates.filter(c => c.index >= from && c.index - from < 80).sort((a, b) => a.index - b.index);
  return after[0] ?? candidates[0];
};

const build = (
  year: number | null,
  month: number,
  day: number,
  time: { h: number; m: number } | null,
  now: Date
): DetectedEventDate | null => {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  let y = year ?? now.getFullYear();
  if (year === null) {
    const candidate = new Date(y, month, day, time?.h ?? 23, time?.m ?? 59);
    // Sin año: la próxima ocurrencia (si ya pasó hace más de un día, el año siguiente)
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) y += 1;
  }
  const date = new Date(y, month, day, time?.h ?? 0, time?.m ?? 0, 0, 0);
  if (isNaN(date.getTime()) || date.getMonth() !== month) return null;
  return { iso: date.toISOString(), hasTime: Boolean(time) };
};

const fullYear = (raw?: string): number | null => {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (raw.length === 2) return 2000 + n;
  return n >= 1970 && n <= 2100 ? n : null;
};

/**
 * Reconoce la primera fecha (y hora, si está cerca) escrita en el texto.
 * Formatos: ISO, `15/11/2026`, `15 de noviembre [de 2026]`, `sáb 15 nov`, `November 15[, 2026]`, `Nov 15`.
 */
export function extractEventDate(rawText?: string | null, now: Date = new Date()): DetectedEventDate | null {
  if (!rawText) return null;
  const text = normalize(rawText);

  // 1. ISO 8601
  const iso = /\b(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(text);
  if (iso) {
    const time = iso[4] ? { h: parseInt(iso[4], 10), m: parseInt(iso[5], 10) } : findTime(text, iso.index + iso[0].length);
    const result = build(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10), time, now);
    if (result) return result;
  }

  // 2. Día + mes textual (es/en): "15 de noviembre de 2026", "15 nov", "15th November"
  const dayMonth = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th|º|°)?\\s*(?:de\\s+)?(${MONTH_ALT})\\b\\.?(?:,?\\s*(?:de\\s+|del\\s+)?(\\d{4}))?`, 'i');
  const dm = dayMonth.exec(text);
  // 3. Mes textual + día (en): "November 15, 2026", "Nov 15"
  const monthDay = new RegExp(`\\b(${MONTH_ALT})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(\\d{4}))?`, 'i');
  const md = monthDay.exec(text);
  const textual = dm && md ? (dm.index <= md.index ? dm : md) : dm || md;
  if (textual) {
    const isDayFirst = textual === dm;
    const day = parseInt(isDayFirst ? textual[1] : textual[2], 10);
    const month = MONTHS[(isDayFirst ? textual[2] : textual[1]).toLowerCase()];
    const result = build(fullYear(textual[3]), month, day, findTime(text, textual.index + textual[0].length), now);
    if (result) return result;
  }

  // 4. Numérico: 15/11/2026, 15-11-26, 15/11 (día/mes; mes/día si el primero no puede ser día)
  const numeric = /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2}|\d{4}))?\b/.exec(text);
  if (numeric) {
    let day = parseInt(numeric[1], 10);
    let month = parseInt(numeric[2], 10);
    if (month > 12 && day <= 12) [day, month] = [month, day];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const result = build(fullYear(numeric[3]), month - 1, day, findTime(text, numeric.index + numeric[0].length), now);
      if (result) return result;
    }
  }

  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const isPastIso = (iso: string): boolean => {
  const t = new Date(iso).getTime();
  return !isNaN(t) && t < Date.now();
};

export const formatEventTime = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "sábado, 15 de noviembre de 2026" (+ " · 20:00" salvo todo el día). */
export const formatEventDateLong = (iso: string, allDay?: boolean): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return allDay ? date : `${date} · ${formatEventTime(iso)}`;
};

/** "sáb 15 nov · 20:00" */
export const formatEventDateShort = (iso: string, allDay?: boolean): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  return allDay ? date : `${date} · ${formatEventTime(iso)}`;
};

/** "hoy", "mañana", "en 3 días", "en 2 h", "finalizado"… */
export const formatCountdown = (iso: string, allDay?: boolean, now: Date = new Date()): { label: string; isPast: boolean } => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { label: '', isPast: false };
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startOfDay.getTime() - startOfToday.getTime()) / 86400000);
  const minutes = Math.round((d.getTime() - now.getTime()) / 60000);

  if (dayDiff < 0) return { label: dayDiff === -1 ? 'Fue ayer' : `Hace ${-dayDiff} días`, isPast: true };
  if (dayDiff === 0) {
    if (allDay) return { label: '¡Hoy!', isPast: false };
    if (minutes < -120) return { label: 'Hoy (ya empezó)', isPast: true };
    if (minutes <= 0) return { label: '¡Está empezando!', isPast: false };
    if (minutes < 60) return { label: `En ${minutes} min`, isPast: false };
    return { label: `Hoy, en ${Math.round(minutes / 60)} h`, isPast: false };
  }
  if (dayDiff === 1) return { label: 'Mañana', isPast: false };
  if (dayDiff < 7) return { label: `En ${dayDiff} días`, isPast: false };
  if (dayDiff < 30) return { label: `En ${Math.round(dayDiff / 7)} semana${dayDiff >= 14 ? 's' : ''}`, isPast: false };
  const months = Math.round(dayDiff / 30);
  return { label: `En ${months} mes${months > 1 ? 'es' : ''}`, isPast: false };
};

/** Enlace para crear el evento en Google Calendar (abre la app o la web del calendario). */
export const buildGoogleCalendarUrl = (params: {
  title: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  location?: string;
  details?: string;
}): string => {
  const start = new Date(params.startsAt);
  const end = params.endsAt ? new Date(params.endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    params.allDay
      ? `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
      : d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endForAllDay = params.allDay ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : end;
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${fmt(start)}/${fmt(endForAllDay)}`,
    ...(params.location ? { location: params.location } : {}),
    ...(params.details ? { details: params.details.slice(0, 500) } : {}),
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
};
