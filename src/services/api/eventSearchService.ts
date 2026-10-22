import { MediaItem, StreamingProvider } from '../../types';
import { requestViaProxy } from './searchProxyService';

/**
 * Búsqueda de eventos (conciertos, stand up, teatro, festivales…) a través de `/api/search/events`,
 * que combina Ticketmaster Discovery, PredictHQ y las ticketeras chilenas (Puntoticket, Ticketpro,
 * Ticketplus) en el backend.
 */

/** Dónde buscar: coordenadas del dispositivo o una ciudad escrita por el usuario. */
export type EventSearchLocation = { lat: number; lon: number; label?: string } | { city: string };

/** Radios de búsqueda ofrecidos en la app (km). */
export const EVENT_RADIUS_OPTIONS_KM = [10, 25, 50, 100] as const;
export const DEFAULT_EVENT_RADIUS_KM = 50;

export interface EventSearchOptions {
  limit?: number;
  near?: EventSearchLocation;
  radiusKm?: number;
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
  source: EventSource;
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

type EventSource = 'ticketmaster' | 'predicthq' | 'puntoticket' | 'ticketpro' | 'ticketplus';

// Las ticketeras se leen al vuelo en el backend: la primera búsqueda tras arrancar puede tardar más
const EVENT_SEARCH_TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; result: EventSearchResult }>();

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80';
const favicon = (domain: string) =>
  `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

const SOURCES: Record<EventSource, { label: string; color: string; domain: string; sellsTickets: boolean }> = {
  ticketmaster: { label: 'Ticketmaster', color: '#026CDF', domain: 'ticketmaster.com', sellsTickets: true },
  predicthq: { label: 'PredictHQ', color: '#6D28D9', domain: 'predicthq.com', sellsTickets: false },
  puntoticket: { label: 'Puntoticket', color: '#E4002B', domain: 'puntoticket.com', sellsTickets: true },
  ticketpro: { label: 'Ticketpro', color: '#F97316', domain: 'ticketpro.cl', sellsTickets: true },
  ticketplus: { label: 'Ticketplus', color: '#00A3E0', domain: 'ticketplus.cl', sellsTickets: true },
};

const sourceInfo = (source: string) =>
  SOURCES[source as EventSource] || { label: source, color: '#64748B', domain: '', sellsTickets: true };

export const isDeviceLocation = (near: EventSearchLocation): near is { lat: number; lon: number; label?: string } =>
  'lat' in near;

export const describeEventLocation = (near: EventSearchLocation): string =>
  isDeviceLocation(near) ? near.label || `${near.lat.toFixed(3)}, ${near.lon.toFixed(3)}` : near.city;

const locationQuery = (near?: EventSearchLocation, radiusKm?: number): string => {
  if (!near) return '';
  const radius = radiusKm ? `&radiusKm=${radiusKm}` : '';
  if (isDeviceLocation(near)) return `&lat=${near.lat.toFixed(4)}&lon=${near.lon.toFixed(4)}${radius}`;
  return `&near=${encodeURIComponent(near.city)}${radius}`;
};

const formatPrice = (event: RemoteEvent): string | null => {
  if (event.priceMin === null) return null;
  const amount = (value: number) => value.toLocaleString('es-CL', { maximumFractionDigits: 0 });
  const currency = event.currency === 'CLP' ? '' : event.currency ? ` ${event.currency}` : '';
  if (event.currency === 'CLP') {
    return event.priceMax && event.priceMax !== event.priceMin
      ? `$${amount(event.priceMin)} – $${amount(event.priceMax)}`
      : `desde $${amount(event.priceMin)}`;
  }
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
    `Fuente: ${sourceInfo(event.source).label}`,
  ].filter(Boolean);
  return parts.join('\n\n');
};

const googleSearchUrl = (event: RemoteEvent) =>
  `https://www.google.com/search?q=${encodeURIComponent([event.title, event.city, 'entradas'].filter(Boolean).join(' '))}`;

export const toEventMediaItem = (event: RemoteEvent): MediaItem => {
  const ticketUrl = event.url || googleSearchUrl(event);
  const source = sourceInfo(event.source);
  const providers: StreamingProvider[] =
    event.url && source.sellsTickets
      ? [
          {
            id: `p-${event.source}`,
            name: source.label,
            type: 'buy',
            color: source.color,
            logoUrl: source.domain ? favicon(source.domain) : undefined,
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
    siteName: source.label,
    eventStartsAt: event.startsAt,
    eventEndsAt: event.endsAt || undefined,
    eventAllDay: event.allDay,
    eventLocation: [event.venue, event.city].filter(Boolean).join(', ') || event.address || undefined,
    eventHideWhenPast: true,
    isManualEntry: false,
    addedBy: { id: 'api', name: source.label },
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

  const cacheKey = `${cleanQuery.toLowerCase()}::${locationQuery(options.near, options.radiusKm)}::${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  const path = `/api/search/events?q=${encodeURIComponent(cleanQuery)}&limit=${limit}${locationQuery(options.near, options.radiusKm)}`;
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
