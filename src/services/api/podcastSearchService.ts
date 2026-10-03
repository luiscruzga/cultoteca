import { MediaItem, StreamingProvider } from '../../types';
import { createTimeoutController } from './requestController';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80';
const faviconFor = (domain: string) =>
  `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

/** Datos comunes a ambos proveedores antes de construir el MediaItem. */
interface PodcastCandidate {
  id: string;
  title: string;
  author: string;
  description?: string;
  image?: string;
  feedUrl?: string;
  appleUrl?: string;
  fyydUrl?: string;
  genres: string[];
  releaseDate?: string;
}

const normalizeFeedUrl = (url?: string) =>
  url ? url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '') : undefined;

// Clave secundaria: un mismo programa puede figurar con feeds distintos (p. ej. tras migrar de hosting)
const showKey = (candidate: PodcastCandidate) =>
  `${candidate.title}|${candidate.author}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9|]+/g, '');

const stripHtml = (text: string) => text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const searchItunesPodcasts = async (query: string, limit: number, signal?: AbortSignal): Promise<PodcastCandidate[]> => {
  const { controller, timeoutId } = createTimeoutController(4000, signal);
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=${limit}`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data.results)) return [];

    return data.results.map((item: any): PodcastCandidate => ({
      id: `podcast-${item.collectionId || item.trackId}`,
      title: item.collectionName || item.trackName || 'Pódcast',
      author: item.artistName || 'Creador desconocido',
      image: item.artworkUrl600 || item.artworkUrl100,
      feedUrl: item.feedUrl,
      appleUrl: item.collectionViewUrl || item.trackViewUrl,
      genres: (Array.isArray(item.genres) ? item.genres : [item.primaryGenreName])
        .filter((genre: string) => genre && genre !== 'Podcasts')
        .slice(0, 3),
      releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : undefined,
    }));
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * fyyd: directorio abierto de feeds RSS (≈3M podcasts, incluidos los que no están en Apple).
 * La búsqueda no requiere clave y tiene CORS abierto. Docs: https://fyyd.de/api-doc
 */
const searchFyydPodcasts = async (query: string, limit: number, signal?: AbortSignal): Promise<PodcastCandidate[]> => {
  const { controller, timeoutId } = createTimeoutController(4000, signal);
  try {
    const url = `https://api.fyyd.de/0.2/search/podcast?title=${encodeURIComponent(query)}&count=${limit}`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];

    return data.data.map((podcast: any): PodcastCandidate => ({
      id: `fyyd-${podcast.id}`,
      title: podcast.title,
      author: podcast.author || 'Creador desconocido',
      description: podcast.description ? stripHtml(podcast.description) : undefined,
      // `layoutImageURL` es la copia cacheada por fyyd; la original puede haber caducado
      image: podcast.layoutImageURL || podcast.imgURL || undefined,
      feedUrl: podcast.xmlURL || undefined,
      fyydUrl: podcast.url_fyyd || undefined,
      genres: [],
      releaseDate: podcast.lastpub ? String(podcast.lastpub).split('T')[0] : undefined,
    }));
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Fusiona iTunes y fyyd conservando el orden de iTunes. Un programa de fyyd con el mismo
 * feed (o el mismo título y autor) que uno de iTunes no se repite: solo aporta su descripción y su ficha.
 */
const mergeCandidates = (itunes: PodcastCandidate[], fyyd: PodcastCandidate[]): PodcastCandidate[] => {
  const merged = [...itunes];
  const byFeed = new Map(itunes.filter(c => c.feedUrl).map(c => [normalizeFeedUrl(c.feedUrl), c]));
  const byShow = new Map(itunes.map(c => [showKey(c), c]));

  for (const candidate of fyyd) {
    const existing =
      (candidate.feedUrl ? byFeed.get(normalizeFeedUrl(candidate.feedUrl)) : undefined) ||
      byShow.get(showKey(candidate));
    if (existing) {
      existing.description = existing.description || candidate.description;
      existing.fyydUrl = existing.fyydUrl || candidate.fyydUrl;
      continue;
    }
    merged.push(candidate);
    if (candidate.feedUrl) byFeed.set(normalizeFeedUrl(candidate.feedUrl), candidate);
    byShow.set(showKey(candidate), candidate);
  }
  return merged;
};

const toMediaItem = (candidate: PodcastCandidate): MediaItem => {
  const year = candidate.releaseDate ? Number(candidate.releaseDate.slice(0, 4)) : 0;
  const posterUrl = candidate.image || PLACEHOLDER_IMAGE;
  const genres = candidate.genres.length > 0 ? candidate.genres : ['Pódcast'];
  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(candidate.title)}/podcastFullResults`;
  const youtubeMusicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(`${candidate.title} podcast`)}`;

  const providers: StreamingProvider[] = [];
  if (candidate.appleUrl) {
    providers.push({ id: 'p-apple-podcasts', name: 'Apple Podcasts', type: 'stream', color: '#B150E2', logoUrl: faviconFor('podcasts.apple.com'), url: candidate.appleUrl });
  }
  providers.push(
    { id: 'p-spotify', name: 'Spotify', type: 'stream', color: '#1DB954', logoUrl: faviconFor('spotify.com'), url: spotifyUrl },
    { id: 'p-youtube-music', name: 'YouTube Music', type: 'stream', color: '#FF0000', logoUrl: faviconFor('music.youtube.com'), url: youtubeMusicUrl }
  );

  return {
    id: candidate.id,
    title: candidate.title,
    originalTitle: candidate.title,
    category: 'podcast',
    year: Number.isFinite(year) ? year : 0,
    releaseDate: candidate.releaseDate,
    director: `Host / Producción: ${candidate.author}`,
    cast: [candidate.author],
    synopsis:
      candidate.description ||
      `Pódcast producido por ${candidate.author}. Explora temas de ${genres.join(', ')}.`,
    posterUrl,
    genres,
    averageRating: 0,
    ratingsCount: 0,
    whereToWatchOrRead: providers,
    externalLinks: [
      ...(candidate.appleUrl ? [{ label: 'Apple Podcasts', url: candidate.appleUrl }] : []),
      { label: 'Buscar en Spotify', url: spotifyUrl },
      { label: 'Buscar en YouTube Music', url: youtubeMusicUrl },
      ...(candidate.feedUrl ? [{ label: 'RSS Feed', url: candidate.feedUrl }] : []),
      ...(candidate.fyydUrl ? [{ label: 'Ficha en fyyd', url: candidate.fyydUrl }] : []),
    ],
    isManualEntry: false,
    addedBy: {
      id: 'current-user',
      name: 'Tú',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    },
    addedAt: new Date().toISOString(),
    comments: [],
  };
};

/**
 * iTunes + fyyd, ambos sin clave y desde el cliente (también para invitados),
 * deduplicados por feed RSS.
 */
export const searchPodcasts = async (query: string, limit: number = 8, signal?: AbortSignal): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const [itunes, fyyd] = await Promise.allSettled([
    searchItunesPodcasts(cleanQuery, limit, signal),
    searchFyydPodcasts(cleanQuery, limit, signal),
  ]);

  const itunesCandidates = itunes.status === 'fulfilled' ? itunes.value : [];
  const fyydCandidates = fyyd.status === 'fulfilled' ? fyyd.value : [];
  if (itunes.status === 'rejected' && fyyd.status === 'rejected') throw itunes.reason;

  // Se reserva hasta un tercio de los huecos a podcasts que solo están en fyyd
  const merged = mergeCandidates(itunesCandidates, fyydCandidates);
  const fyydOnly = merged.slice(itunesCandidates.length);
  const fyydSlots = Math.min(fyydOnly.length, Math.ceil(limit / 3));
  const itunesCount = Math.min(itunesCandidates.length, limit - fyydSlots);
  return [...itunesCandidates.slice(0, itunesCount), ...fyydOnly.slice(0, limit - itunesCount)].map(toMediaItem);
};
