import { MediaItem, StreamingProvider } from '../../types';
import { requestViaProxy } from './searchProxyService';

/**
 * Búsqueda de eventos (conciertos, stand up, teatro, festivales…) a través de `/api/search/events`,
 * que combina Ticketmaster Discovery y PredictHQ en el backend.
 */

/** Dónde buscar: coordenadas del dispositivo o una ciudad escrita por el usuario. */
export type EventSearchLocation = { lat: number; lon: number; label?: string } | { city: string };

export interface EventSearchOptions {
  limit?: number;
  near?: EventSearchLocation;
  signal?: AbortSignal;
}

export interface EventSearchResult {
  items: MediaItem[];
  /** `false` cuando el backend no tiene ninguna clave de proveedor de eventos. */
  configured: boolean;
  /** Código de error del backend cuando no hay resultados (p. ej. `place_not_found`). */
  error?: string;
  /** Lugar resuelto por el backend al buscar por ciudad. */
  resolvedLocation?: { lat: number; lon: number; label: string | null };
}

/** Resultado normalizado del backend. */
interface RemoteEvent {
  id: string;
  source: 'ticketmaster' | 'predicthq';
  title: string;
  description: string;
  url: string | null;
  image: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number | null;
  lon: number | null;
  genres: string[];
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  status: string | null;
}

interface EventsProxyResponse {
  configured: boolean;
  results: RemoteEvent[];
  error?: string;
  location?: { lat: number; lon: number; label: string | null };
}

const EVENT_SEARCH_TIMEOUT_MS = 9000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; result: EventSearchResult }>();

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80';
const favicon = (domain: string) =>
  `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

const SOURCE_LABELS: Record<RemoteEvent['source'], string> = { ticketmaster: 'Ticketmaster', predicthq: 'PredictHQ' };

export const isDeviceLocation = (near: EventSearchLocation): near is { lat: number; lon: number; label?: string } =>
  'lat' in near;

export const describeEventLocation = (near: EventSearchLocation): string =>
  isDeviceLocation(near) ? near.label || `${near.lat.toFixed(3)}, ${near.lon.toFixed(3)}` : near.city;

const locationQuery = (near?: EventSearchLocation): string => {
  if (!near) return '';
  if (isDeviceLocation(near)) return `&lat=${near.lat.toFixed(4)}&lon=${near.lon.toFixed(4)}`;
  return `&near=${encodeURIComponent(near.city)}`;
};

const formatPrice = (event: RemoteEvent): string | null => {
  if (event.priceMin === null) return null;
  const amount = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  const currency = event.currency ? ` ${event.currency}` : '';
  return event.priceMax && event.priceMax !== event.priceMin
    ? `${amount(event.priceMin)} – ${amount(event.priceMax)}${currency}`
    : `desde ${amount(event.priceMin)}${currency}`;
};

const buildSynopsis = (event: RemoteEvent): string => {
  const parts = [
    event.description.trim(),
    event.genres.length ? event.genres.join(' · ') : '',
    [event.venue, event.address, event.city, event.country].filter(Boolean).join(', '),
    formatPrice(event) ? `Entradas ${formatPrice(event)}` : '',
    `Fuente: ${SOURCE_LABELS[event.source]}`,
  ].filter(Boolean);
  return parts.join('\n\n');
};

const googleSearchUrl = (event: RemoteEvent) =>
  `https://www.google.com/search?q=${encodeURIComponent([event.title, event.city, 'entradas'].filter(Boolean).join(' '))}`;

export const toEventMediaItem = (event: RemoteEvent): MediaItem => {
  const ticketUrl = event.url || googleSearchUrl(event);
  const providers: StreamingProvider[] = event.url
    ? [
        {
          id: 'p-ticketmaster',
          name: 'Ticketmaster',
          type: 'buy',
          color: '#026CDF',
          logoUrl: favicon('ticketmaster.com'),
          url: event.url,
          linkKind: 'direct',
        },
      ]
    : [];
  const year = parseInt(event.startsAt.slice(0, 4), 10);
  return {
    id: `event-${event.source}-${event.id}`,
    title: event.title,
    category: 'event',
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    releaseDate: event.startsAt.slice(0, 10),
    synopsis: buildSynopsis(event),
    posterUrl: event.image || PLACEHOLDER_IMAGE,
    backdropUrl: event.image || undefined,
    genres: event.genres,
    averageRating: 0,
    ratingsCount: 0,
    whereToWatchOrRead: providers,
    externalLinks: [{ label: event.url ? 'Entradas' : 'Buscar entradas', url: ticketUrl }],
    url: ticketUrl,
    siteName: SOURCE_LABELS[event.source],
    eventStartsAt: event.startsAt,
    eventEndsAt: event.endsAt || undefined,
    eventAllDay: event.allDay,
    eventLocation: [event.venue, event.city].filter(Boolean).join(', ') || event.address || undefined,
    eventHideWhenPast: true,
    isManualEntry: false,
    addedBy: { id: 'api', name: SOURCE_LABELS[event.source] },
    addedAt: new Date().toISOString(),
    comments: [],
  };
};

/**
 * Busca eventos por texto y/o cerca de una ubicación. Con texto vacío hace falta `near`.
 * Devuelve `configured: false` si el backend no tiene proveedores y una lista vacía si no hay sesión.
 */
export const searchEvents = async (query: string, options: EventSearchOptions = {}): Promise<EventSearchResult> => {
  const cleanQuery = query.trim();
  const limit = options.limit ?? 10;
  if (!cleanQuery && !options.near) return { items: [], configured: true };

  const cacheKey = `${cleanQuery.toLowerCase()}::${locationQuery(options.near)}::${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  const path = `/api/search/events?q=${encodeURIComponent(cleanQuery)}&limit=${limit}${locationQuery(options.near)}`;
  const response = await requestViaProxy<RemoteEvent>(path, options.signal, EVENT_SEARCH_TIMEOUT_MS);
  if (!response) return { items: [], configured: true, error: 'backend_unavailable' };

  const proxy = response as unknown as EventsProxyResponse;
  const result: EventSearchResult = {
    items: (proxy.results || []).map(toEventMediaItem),
    configured: proxy.configured !== false,
    error: proxy.error,
    resolvedLocation: proxy.location,
  };
  if (!result.error) {
    cache.set(cacheKey, { at: Date.now(), result });
    if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  }
  return result;
};
