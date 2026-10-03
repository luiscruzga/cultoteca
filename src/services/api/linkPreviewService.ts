import { MediaItem } from '../../types';

export type SocialPlatform = 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'web';

export interface LinkPreviewData {
  url: string;
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
}

// Fallback visual artwork by platform
const FALLBACK_IMAGES: Record<SocialPlatform, string> = {
  twitter: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80',
  instagram: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&q=80',
  facebook: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800&q=80',
  youtube: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
  web: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&q=80',
};

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

/**
 * Parses Open Graph, Twitter and standard meta tags from HTML string.
 */
function parseHtmlMetadata(html: string, pageUrl: string): {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
} {
  const result: {
    title?: string;
    description?: string;
    imageUrl?: string;
    siteName?: string;
  } = {};

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

  return result;
}

/**
 * Fetches preview metadata for YouTube using oEmbed.
 */
async function fetchYouTubeOEmbed(url: string): Promise<Partial<LinkPreviewData> | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || '',
      description: data.author_name ? `Video de ${data.author_name} en YouTube` : 'Video de YouTube',
      imageUrl: data.thumbnail_url || '',
      siteName: 'YouTube',
    };
  } catch {
    return null;
  }
}

/**
 * Fetches preview metadata for Twitter / X using oEmbed or FxTwitter API.
 */
async function fetchTwitterOEmbed(url: string): Promise<Partial<LinkPreviewData> | null> {
  // Strategy 1: Official Twitter Publish oEmbed
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      let text = '';
      if (data.html) {
        // Strip tags from oembed html blockquote
        text = decodeHtmlEntities(data.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      }
      return {
        title: data.author_name ? `Publicación de @${data.author_name} en X` : 'Publicación en X (Twitter)',
        description: text || 'Publicación en X',
        siteName: 'X (Twitter)',
        imageUrl: FALLBACK_IMAGES.twitter,
      };
    }
  } catch {
    // Strategy 1 failed, continue
  }

  // Strategy 2: FxTwitter API for rich image extraction
  try {
    const parsed = new URL(url);
    const fxUrl = `https://api.fxtwitter.com${parsed.pathname}`;
    const res = await fetch(fxUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.tweet) {
        const t = data.tweet;
        const img = t.media?.photos?.[0]?.url || t.media?.mosaic?.formats?.jpeg || t.author?.avatar_url;
        return {
          title: t.author?.name ? `Publicación de ${t.author.name} (@${t.author.screen_name})` : 'Publicación en X',
          description: t.text || '',
          imageUrl: img || FALLBACK_IMAGES.twitter,
          siteName: 'X (Twitter)',
        };
      }
    }
  } catch {
    // FxTwitter failed
  }

  return null;
}

/**
 * Main service method: extracts preview metadata for any URL.
 */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewData> {
  const normalized = normalizeUrl(rawUrl);
  const platformInfo = detectPlatform(normalized);

  const fallbackResult: LinkPreviewData = {
    url: normalized,
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
  };

  if (!normalized) {
    return fallbackResult;
  }

  // Try platform-specific APIs first
  if (platformInfo.platform === 'youtube') {
    const ytData = await fetchYouTubeOEmbed(normalized);
    if (ytData && ytData.title) {
      return {
        ...fallbackResult,
        title: ytData.title || fallbackResult.title,
        description: ytData.description || fallbackResult.description,
        imageUrl: ytData.imageUrl || fallbackResult.imageUrl,
        siteName: ytData.siteName || fallbackResult.siteName,
        isFallback: false,
      };
    }
  }

  if (platformInfo.platform === 'twitter') {
    const twData = await fetchTwitterOEmbed(normalized);
    if (twData && (twData.title || twData.description)) {
      return {
        ...fallbackResult,
        title: twData.title || fallbackResult.title,
        description: twData.description || fallbackResult.description,
        imageUrl: twData.imageUrl || fallbackResult.imageUrl,
        siteName: twData.siteName || fallbackResult.siteName,
        isFallback: false,
      };
    }
  }

  // Fetch HTML directly with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    const response = await fetch(normalized, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const htmlText = await response.text();
      const meta = parseHtmlMetadata(htmlText, normalized);

      const title = meta.title || fallbackResult.title;
      const description = meta.description || '';
      const imageUrl = meta.imageUrl || fallbackResult.imageUrl;
      const siteName = meta.siteName || platformInfo.platformLabel;

      return {
        ...fallbackResult,
        title,
        description,
        imageUrl,
        siteName,
        isFallback: !meta.title && !meta.description && !meta.imageUrl,
      };
    }
  } catch {
    // If fetching fails or times out, fallback seamlessly
  }

  return fallbackResult;
}

/**
 * Converts a preview and user customizations into a standardized MediaItem.
 */
export function buildLinkMediaItem(params: {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  previewData?: LinkPreviewData;
  currentUser: { id: string; name: string; avatar?: string };
  userRating?: number;
}): MediaItem {
  const { url, title, description, imageUrl, previewData, currentUser, userRating } = params;
  const platformInfo = detectPlatform(url);
  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  const finalImage =
    imageUrl?.trim() ||
    previewData?.imageUrl ||
    FALLBACK_IMAGES[platformInfo.platform] ||
    FALLBACK_IMAGES.web;

  return {
    id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || platformInfo.cleanDomain,
    originalTitle: previewData?.title || title.trim(),
    category: 'link',
    year: currentYear,
    releaseDate: now.split('T')[0],
    synopsis: description.trim(),
    posterUrl: finalImage,
    backdropUrl: finalImage,
    genres: ['Enlace', platformInfo.platformLabel],
    averageRating: userRating || 0,
    ratingsCount: userRating ? 1 : 0,
    userRating,
    url: url.trim(),
    siteName: previewData?.siteName || platformInfo.platformLabel,
    externalLinks: [{ label: `Visitar en ${platformInfo.platformLabel}`, url: url.trim() }],
    whereToWatchOrRead: [
      {
        id: `provider-${platformInfo.platform}`,
        name: platformInfo.platformLabel,
        type: 'read',
        url: url.trim(),
        color: platformInfo.platformColor,
      },
    ],
    isManualEntry: true,
    addedBy: currentUser,
    addedAt: now,
    comments: [],
  };
}
