import { MediaItem } from '../../types';
import { requestBackend } from './searchProxyService';
import { extractEventDate } from '../../utils/eventDates';

export type SocialPlatform = 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'web';

export interface LinkPreviewData {
  /** URL canónica (enlaces cortos ya resueltos); es la que se guarda en el ítem. */
  url: string;
  /** URL tal y como la introdujo el usuario. */
  originalUrl: string;
  title: string;
  description: string;
  imageUrl: string;
  siteName: string;
  platform: SocialPlatform;
  platformLabel: string;
  platformColor: string;
  platformIcon: string;
  faviconUrl?: string;
  isFallback?: boolean;
  /** Fecha de evento sugerida (ISO) a partir de la página o del texto de la publicación. */
  eventStartsAt?: string;
  eventHasTime?: boolean;
}

interface PartialMetadata {
  url?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  /** Fecha de inicio declarada por la página (`event:start_time` o JSON-LD `startDate`). */
  eventStartsAt?: string;
}

// Fallback visual artwork by platform
const FALLBACK_IMAGES: Record<SocialPlatform, string> = {
  twitter: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80',
  instagram: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&q=80',
  facebook: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800&q=80',
  youtube: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
  tiktok: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80',
  web: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&q=80',
};

/** Hosts de enlaces cortos que se resuelven a su URL canónica antes de buscar metadatos. */
const SHORT_LINK_HOSTS = ['vm.tiktok.com', 'vt.tiktok.com', 't.co', 'fb.watch', 'l.instagram.com'];

const OEMBED_TIMEOUT_MS = 6000;
const REDIRECT_TIMEOUT_MS = 6000;
const BACKEND_TIMEOUT_MS = 7000;
const SCRAPE_TIMEOUT_MS = 7500;

/**
 * Normalizes input URL string ensuring valid protocol.
 */
export function normalizeUrl(rawUrl: string): string {
  let trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

/** Primera URL http(s) que aparece en un texto (p. ej. el texto compartido por otra app). */
export function extractFirstUrl(text?: string | null): string | null {
  if (!text) return null;
  const match = /https?:\/\/[^\s<>"'）)\]]+/i.exec(text);
  if (match) return match[0].replace(/[.,;:!?]+$/, '');
  const bare = /(?:^|\s)((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s]*)/i.exec(text);
  return bare ? normalizeUrl(bare[1]) : null;
}

/**
 * Identifies social network or web domain information.
 */
export function detectPlatform(urlStr: string): {
  platform: SocialPlatform;
  platformLabel: string;
  platformColor: string;
  platformIcon: string;
  cleanDomain: string;
} {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host.includes('twitter.com') || host.includes('x.com') || host === 't.co') {
      return {
        platform: 'twitter',
        platformLabel: 'X (Twitter)',
        platformColor: '#000000',
        platformIcon: 'logo-twitter',
        cleanDomain: 'x.com',
      };
    }
    if (host.includes('instagram.com') || host === 'instagr.am') {
      return {
        platform: 'instagram',
        platformLabel: 'Instagram',
        platformColor: '#E1306C',
        platformIcon: 'logo-instagram',
        cleanDomain: 'instagram.com',
      };
    }
    if (host.includes('facebook.com') || host.includes('fb.com') || host.includes('fb.watch')) {
      return {
        platform: 'facebook',
        platformLabel: 'Facebook',
        platformColor: '#1877F2',
        platformIcon: 'logo-facebook',
        cleanDomain: 'facebook.com',
      };
    }
    if (host.includes('youtube.com') || host === 'youtu.be') {
      return {
        platform: 'youtube',
        platformLabel: 'YouTube',
        platformColor: '#FF0000',
        platformIcon: 'logo-youtube',
        cleanDomain: 'youtube.com',
      };
    }
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      return {
        platform: 'tiktok',
        platformLabel: 'TikTok',
        platformColor: '#FE2C55',
        platformIcon: 'logo-tiktok',
        cleanDomain: 'tiktok.com',
      };
    }

    return {
      platform: 'web',
      platformLabel: host,
      platformColor: '#4F46E5',
      platformIcon: 'globe-outline',
      cleanDomain: host,
    };
  } catch {
    return {
      platform: 'web',
      platformLabel: 'Web',
      platformColor: '#4F46E5',
      platformIcon: 'globe-outline',
      cleanDomain: 'web',
    };
  }
}

/**
 * Decodes basic HTML entities.
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves relative URLs to absolute.
 */
function toAbsoluteUrl(candidateUrl: string, baseUrl: string): string {
  try {
    return new URL(candidateUrl, baseUrl).href;
  } catch {
    return candidateUrl;
  }
}

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchJson = async <T>(url: string, timeoutMs = OEMBED_TIMEOUT_MS): Promise<T | null> => {
  try {
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, timeoutMs);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

const isShortLink = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return SHORT_LINK_HOSTS.includes(host);
  } catch {
    return false;
  }
};

/**
 * Sigue las redirecciones de un enlace corto y devuelve la URL final.
 * En web el navegador puede bloquearlo por CORS: se devuelve la original.
 */
async function resolveShortLink(url: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, REDIRECT_TIMEOUT_MS);
    const finalUrl = res.url;
    if (finalUrl && /^https?:\/\//i.test(finalUrl)) {
      // Instagram y Facebook redirigen a login conservando la URL de destino en `next`/`u`
      try {
        const parsed = new URL(finalUrl);
        const next = parsed.searchParams.get('next') || parsed.searchParams.get('u');
        if (/\/login/.test(parsed.pathname) && next) return toAbsoluteUrl(next, finalUrl);
      } catch {
        // se ignora
      }
      return finalUrl;
    }
  } catch {
    // CORS, red o timeout: se mantiene la URL original
  }
  return url;
}

/**
 * Parses Open Graph, Twitter and standard meta tags from HTML string.
 */
function parseHtmlMetadata(html: string, pageUrl: string): PartialMetadata {
  const result: PartialMetadata = {};

  // Extract meta tags: property/name and content
  const metaRegex = /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*>/gi;
  const metaRegexAlt = /<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:name|property)=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;

  const processMeta = (key: string, value: string) => {
    const k = key.toLowerCase();
    const v = decodeHtmlEntities(value);
    if (!v) return;

    if (!result.title && (k === 'og:title' || k === 'twitter:title')) {
      result.title = v;
    }
    if (!result.description && (k === 'og:description' || k === 'twitter:description' || k === 'description')) {
      result.description = v;
    }
    if (!result.imageUrl && (k === 'og:image' || k === 'twitter:image' || k === 'twitter:image:src')) {
      result.imageUrl = toAbsoluteUrl(v, pageUrl);
    }
    if (!result.siteName && (k === 'og:site_name' || k === 'site_name')) {
      result.siteName = v;
    }
    if (!result.url && k === 'og:url') {
      result.url = toAbsoluteUrl(v, pageUrl);
    }
    if (!result.eventStartsAt && (k === 'event:start_time' || k === 'og:start_time' || k === 'startdate')) {
      result.eventStartsAt = v;
    }
  };

  while ((match = metaRegex.exec(html)) !== null) {
    processMeta(match[1], match[2]);
  }
  while ((match = metaRegexAlt.exec(html)) !== null) {
    processMeta(match[2], match[1]);
  }

  // Fallback to <title> if og:title missing
  if (!result.title) {
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleMatch && titleMatch[1]) {
      result.title = decodeHtmlEntities(titleMatch[1]);
    }
  }

  // JSON-LD de tipo Event: "startDate"
  if (!result.eventStartsAt) {
    const ldMatch = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
    let ld: RegExpExecArray | null;
    while (!result.eventStartsAt && (ld = ldMatch.exec(html)) !== null) {
      const start = /"startDate"\s*:\s*"([^"]+)"/.exec(ld[1]);
      if (start) result.eventStartsAt = start[1];
    }
  }

  return result;
}

/** Fecha de evento sugerida: la declarada por la página y, si no, la escrita en título/descripción. */
const resolveEventDate = (meta: PartialMetadata): { eventStartsAt?: string; eventHasTime?: boolean } => {
  if (meta.eventStartsAt) {
    const d = new Date(meta.eventStartsAt);
    if (!isNaN(d.getTime())) {
      return { eventStartsAt: d.toISOString(), eventHasTime: /T\d{1,2}:\d{2}/.test(meta.eventStartsAt) };
    }
  }
  const detected = extractEventDate([meta.title, meta.description].filter(Boolean).join('. '));
  return detected ? { eventStartsAt: detected.iso, eventHasTime: detected.hasTime } : {};
};

/** Títulos genéricos que devuelven las páginas de login o de bloqueo: no aportan nada. */
const GENERIC_TITLES = ['instagram', 'facebook', 'log in', 'iniciar sesión', 'tiktok', 'x', 'twitter'];
const isGenericTitle = (title?: string) => !title || GENERIC_TITLES.includes(title.trim().toLowerCase());

const hasUsefulMetadata = (meta: PartialMetadata | null): boolean =>
  Boolean(meta && ((meta.title && !isGenericTitle(meta.title)) || meta.description || meta.imageUrl));

/**
 * Fetches preview metadata for YouTube using oEmbed.
 */
async function fetchYouTubeOEmbed(url: string): Promise<PartialMetadata | null> {
  const data = await fetchJson<{ title?: string; author_name?: string; thumbnail_url?: string }>(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  );
  if (!data) return null;
  return {
    title: data.title || '',
    description: data.author_name ? `Video de ${data.author_name} en YouTube` : 'Video de YouTube',
    imageUrl: data.thumbnail_url || '',
    siteName: 'YouTube',
  };
}

/**
 * Fetches preview metadata for TikTok using its public oEmbed endpoint (no token needed).
 * Also resolves short links: the response carries the video id and the author handle.
 */
async function fetchTikTokOEmbed(url: string): Promise<PartialMetadata | null> {
  const data = await fetchJson<{
    title?: string;
    author_name?: string;
    author_unique_id?: string;
    author_url?: string;
    thumbnail_url?: string;
    embed_product_id?: string;
  }>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  if (!data || (!data.title && !data.embed_product_id)) return null;

  const handle = data.author_unique_id || data.author_url?.match(/@([^/?]+)/)?.[1];
  const canonical =
    data.embed_product_id && handle
      ? `https://www.tiktok.com/@${handle}/video/${data.embed_product_id}`
      : undefined;
  const author = data.author_name ? `${data.author_name}` : handle ? `@${handle}` : '';
  const caption = decodeHtmlEntities(data.title || '');
  return {
    url: canonical,
    title: author ? `${author} en TikTok` : caption || 'Video de TikTok',
    description: caption,
    imageUrl: data.thumbnail_url || '',
    siteName: 'TikTok',
  };
}

/**
 * Fetches preview metadata for Twitter / X using oEmbed or FxTwitter API.
 */
async function fetchTwitterOEmbed(url: string): Promise<PartialMetadata | null> {
  // Strategy 1: Official Twitter Publish oEmbed
  const oembed = await fetchJson<{ html?: string; author_name?: string; url?: string }>(
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
  );
  if (oembed) {
    let text = '';
    if (oembed.html) {
      // Strip tags from oembed html blockquote
      text = decodeHtmlEntities(oembed.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    }
    return {
      url: oembed.url,
      title: oembed.author_name ? `Publicación de ${oembed.author_name} en X` : 'Publicación en X (Twitter)',
      description: text || 'Publicación en X',
      siteName: 'X (Twitter)',
      imageUrl: FALLBACK_IMAGES.twitter,
    };
  }

  // Strategy 2: FxTwitter API for rich image extraction
  try {
    const parsed = new URL(url);
    const data = await fetchJson<{ tweet?: any }>(`https://api.fxtwitter.com${parsed.pathname}`);
    if (data?.tweet) {
      const t = data.tweet;
      const img = t.media?.photos?.[0]?.url || t.media?.mosaic?.formats?.jpeg || t.author?.avatar_url;
      return {
        url: t.url,
        title: t.author?.name ? `Publicación de ${t.author.name} (@${t.author.screen_name})` : 'Publicación en X',
        description: t.text || '',
        imageUrl: img || FALLBACK_IMAGES.twitter,
        siteName: 'X (Twitter)',
      };
    }
  } catch {
    // FxTwitter failed
  }

  return null;
}

/**
 * Backend metadata proxy (`GET /api/link-preview`): the server downloads the page with a crawler
 * User-Agent, which Instagram and Facebook serve with Open Graph tags, and it is not affected by CORS.
 * Returns null without a verified session or when the backend is unavailable.
 */
async function fetchBackendLinkPreview(url: string): Promise<PartialMetadata | null> {
  try {
    const data = await requestBackend<PartialMetadata & { error?: string }>(
      `/api/link-preview?url=${encodeURIComponent(url)}`,
      undefined,
      BACKEND_TIMEOUT_MS
    );
    if (!data || data.error) return null;
    return data;
  } catch {
    return null;
  }
}

/** Device-side Open Graph scraping (last resort; blocked by CORS on web). */
async function fetchDeviceScrape(url: string): Promise<PartialMetadata | null> {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      },
      SCRAPE_TIMEOUT_MS
    );
    if (!response.ok) return null;
    return parseHtmlMetadata(await response.text(), url);
  } catch {
    return null;
  }
}

/**
 * Main service method: extracts preview metadata for any URL.
 * Order: short-link resolution → platform oEmbed → backend proxy → device scraping → fallback.
 */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewData> {
  const normalized = normalizeUrl(rawUrl);
  let platformInfo = detectPlatform(normalized);

  const buildFallback = (url: string): LinkPreviewData => ({
    url,
    originalUrl: rawUrl,
    title: platformInfo.platformLabel !== 'Web' ? `${platformInfo.platformLabel}` : platformInfo.cleanDomain,
    description: '',
    imageUrl: FALLBACK_IMAGES[platformInfo.platform] || FALLBACK_IMAGES.web,
    siteName: platformInfo.platformLabel,
    platform: platformInfo.platform,
    platformLabel: platformInfo.platformLabel,
    platformColor: platformInfo.platformColor,
    platformIcon: platformInfo.platformIcon,
    isFallback: true,
  });

  if (!normalized) {
    return buildFallback(normalized);
  }

  // 1. Short links → canonical URL (the platform may change, e.g. t.co → any site)
  let canonical = normalized;
  if (isShortLink(normalized)) {
    canonical = await resolveShortLink(normalized);
    platformInfo = detectPlatform(canonical);
  }

  const merge = (meta: PartialMetadata, isFallback = false): LinkPreviewData => {
    const fallback = buildFallback(meta.url || canonical);
    return {
      ...fallback,
      title: meta.title || fallback.title,
      description: meta.description || '',
      imageUrl: meta.imageUrl || fallback.imageUrl,
      siteName: meta.siteName || fallback.siteName,
      isFallback,
      ...resolveEventDate(meta),
    };
  };

  // 2. Platform oEmbed without token
  let oembed: PartialMetadata | null = null;
  if (platformInfo.platform === 'youtube') oembed = await fetchYouTubeOEmbed(canonical);
  else if (platformInfo.platform === 'twitter') oembed = await fetchTwitterOEmbed(canonical);
  else if (platformInfo.platform === 'tiktok') oembed = await fetchTikTokOEmbed(canonical);
  if (oembed && (oembed.title || oembed.description)) {
    return merge(oembed);
  }

  // 3. Backend proxy, 4. device-side scraping
  const backend = await fetchBackendLinkPreview(canonical);
  if (backend && hasUsefulMetadata(backend)) {
    return merge({ ...backend, url: backend.url && isShortLink(canonical) ? backend.url : canonical });
  }
  const scraped = await fetchDeviceScrape(canonical);
  if (scraped && hasUsefulMetadata(scraped)) {
    return merge({ ...scraped, url: canonical });
  }
  if (scraped?.title) {
    return merge({ ...scraped, url: canonical }, true);
  }

  return buildFallback(canonical);
}

/**
 * Converts a preview and user customizations into a standardized MediaItem.
 */
export interface LinkEventParams {
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  location?: string;
}

export function buildLinkMediaItem(params: {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  previewData?: LinkPreviewData;
  currentUser: { id: string; name: string; avatar?: string };
  userRating?: number;
  /** Con fecha: el ítem se guarda como evento en vez de como enlace. */
  event?: LinkEventParams;
}): MediaItem {
  const { url, title, description, imageUrl, previewData, currentUser, userRating, event } = params;
  const typedUrl = url.trim();
  // The canonical URL of the preview (short links resolved) is the one stored; the typed one stays as a link.
  const previewMatchesInput =
    previewData && normalizeUrl(previewData.originalUrl) === normalizeUrl(typedUrl) && previewData.url;
  const finalUrl = previewMatchesInput ? previewData.url : typedUrl;
  const platformInfo = detectPlatform(finalUrl);
  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  const finalImage =
    imageUrl?.trim() ||
    previewData?.imageUrl ||
    FALLBACK_IMAGES[platformInfo.platform] ||
    FALLBACK_IMAGES.web;

  const externalLinks = [{ label: `Visitar en ${platformInfo.platformLabel}`, url: finalUrl }];
  if (finalUrl !== typedUrl) externalLinks.push({ label: 'Enlace original', url: typedUrl });

  const eventDate = event ? new Date(event.startsAt) : null;

  return {
    id: `${event ? 'event' : 'link'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || platformInfo.cleanDomain,
    originalTitle: previewData?.title || title.trim(),
    category: event ? 'event' : 'link',
    year: eventDate && !isNaN(eventDate.getTime()) ? eventDate.getFullYear() : currentYear,
    releaseDate: eventDate && !isNaN(eventDate.getTime()) ? event!.startsAt.split('T')[0] : now.split('T')[0],
    synopsis: description.trim(),
    posterUrl: finalImage,
    backdropUrl: finalImage,
    genres: [event ? 'Evento' : 'Enlace', platformInfo.platformLabel],
    ...(event
      ? {
          eventStartsAt: event.startsAt,
          eventEndsAt: event.endsAt,
          eventAllDay: Boolean(event.allDay),
          eventLocation: event.location?.trim() || undefined,
        }
      : {}),
    averageRating: userRating || 0,
    ratingsCount: userRating ? 1 : 0,
    userRating,
    url: finalUrl,
    siteName: previewData?.siteName || platformInfo.platformLabel,
    externalLinks,
    whereToWatchOrRead: [
      {
        id: `provider-${platformInfo.platform}`,
        name: platformInfo.platformLabel,
        type: 'read',
        url: finalUrl,
        color: platformInfo.platformColor,
      },
    ],
    isManualEntry: true,
    addedBy: currentUser,
    addedAt: now,
    comments: [],
  };
}
