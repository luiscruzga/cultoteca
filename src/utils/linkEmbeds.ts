/**
 * Deriva, a partir de la URL guardada en un ítem de tipo enlace, el reproductor o widget
 * oficial de la plataforma que se puede embeber dentro de la app. Función pura: los ítems
 * ya guardados se benefician sin migración.
 */

export type LinkEmbedKind =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'twitter'
  | 'facebook-video'
  | 'facebook-post';

export interface LinkEmbed {
  kind: LinkEmbedKind;
  /** URL del documento embebible (vacía para YouTube, que usa `videoId`). */
  embedUrl: string;
  /** Id de vídeo de YouTube. */
  videoId?: string;
  /** Relación ancho/alto del contenedor. */
  aspectRatio: number;
  /** Altura máxima en píxeles (formatos verticales). */
  maxHeight?: number;
  /** Alto fijo y scroll interno (widgets de publicaciones de altura variable). */
  fixedHeight?: number;
  /** Hosts a los que el frame principal puede navegar; el resto se abre fuera de la app. */
  allowedHosts: string[];
  /** La plataforma reproduce automáticamente (silenciado). */
  autoplay: boolean;
  /** El embed tiene audio que se puede activar (parámetro de silencio o <video> controlable). */
  supportsSound: boolean;
}

const parse = (url?: string | null): URL | null => {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return null;
  }
};

const hostOf = (parsed: URL) => parsed.hostname.toLowerCase().replace(/^www\.|^m\.|^mobile\./, '');

export const extractYouTubeId = (url?: string | null): string | null => {
  const parsed = parse(url);
  if (!parsed) return null;
  const host = hostOf(parsed);
  if (host === 'youtu.be') return parsed.pathname.split('/')[1] || null;
  if (!host.endsWith('youtube.com') && host !== 'youtube-nocookie.com') return null;
  const v = parsed.searchParams.get('v');
  if (v) return v;
  const match = /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})/.exec(parsed.pathname);
  return match ? match[1] : null;
};

export function resolveLinkEmbed(url?: string | null): LinkEmbed | null {
  const parsed = parse(url);
  if (!parsed) return null;
  const host = hostOf(parsed);
  const path = parsed.pathname;

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      kind: 'youtube',
      embedUrl: '',
      videoId: youtubeId,
      aspectRatio: 16 / 9,
      allowedHosts: ['youtube.com', 'youtube-nocookie.com'],
      autoplay: true,
      supportsSound: true,
    };
  }

  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const match = /\/(?:video|photo)\/(\d+)/.exec(path);
    if (!match) return null;
    const params = 'autoplay=1&muted=1&loop=1&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0';
    return {
      kind: 'tiktok',
      embedUrl: `https://www.tiktok.com/player/v1/${match[1]}?${params}`,
      aspectRatio: 9 / 16,
      maxHeight: 520,
      allowedHosts: ['tiktok.com'],
      autoplay: true,
      supportsSound: true,
    };
  }

  if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') {
    const match = /^\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(path);
    if (!match) return null;
    const type = match[1] === 'reels' ? 'reel' : match[1];
    return {
      kind: 'instagram',
      embedUrl: `https://www.instagram.com/${type}/${match[2]}/embed/`,
      aspectRatio: 4 / 5,
      maxHeight: 560,
      allowedHosts: ['instagram.com'],
      autoplay: type !== 'p',
      supportsSound: type !== 'p',
    };
  }

  if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
    const match = /\/status(?:es)?\/(\d+)/.exec(path);
    if (!match) return null;
    return {
      kind: 'twitter',
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}&theme=dark&dnt=true&hideThread=true&lang=es`,
      aspectRatio: 1,
      fixedHeight: 420,
      allowedHosts: ['platform.twitter.com', 'twitter.com', 'x.com'],
      autoplay: true,
      supportsSound: false,
    };
  }

  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host === 'fb.watch') {
    const href = encodeURIComponent(parsed.href);
    const isVideo =
      host === 'fb.watch' ||
      /\/(videos?|reels?|watch|live)(\/|$)/.test(path) ||
      (path === '/watch/' && parsed.searchParams.has('v')) ||
      parsed.searchParams.has('v');
    if (isVideo) {
      return {
        kind: 'facebook-video',
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${href}&autoplay=true&mute=true&show_text=false&allowfullscreen=true`,
        aspectRatio: 16 / 9,
        allowedHosts: ['facebook.com'],
        autoplay: true,
        supportsSound: true,
      };
    }
    const isPost = /\/(posts|photos?|permalink\.php|story\.php|share)(\/|$)/.test(path) || parsed.searchParams.has('fbid') || parsed.searchParams.has('story_fbid');
    if (!isPost) return null;
    return {
      kind: 'facebook-post',
      embedUrl: `https://www.facebook.com/plugins/post.php?href=${href}&show_text=true`,
      aspectRatio: 1,
      fixedHeight: 480,
      allowedHosts: ['facebook.com'],
      autoplay: false,
      supportsSound: false,
    };
  }

  return null;
}

/** URL del embed con o sin silencio (las plataformas que lo exponen como parámetro). */
export const embedUrlFor = (embed: LinkEmbed, muted: boolean): string => {
  if (muted) return embed.embedUrl;
  switch (embed.kind) {
    case 'tiktok':
      return embed.embedUrl.replace('muted=1', 'muted=0');
    case 'facebook-video':
      return embed.embedUrl.replace('mute=true', 'mute=false');
    default:
      return embed.embedUrl;
  }
};

export const describeEmbedKind = (kind: LinkEmbedKind): string =>
  ({
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    twitter: 'X',
    'facebook-video': 'Facebook',
    'facebook-post': 'Facebook',
  })[kind];
