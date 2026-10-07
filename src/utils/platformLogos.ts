import { StreamingProvider } from '../types';

export type PlatformGroup = 'video' | 'music' | 'reading' | 'games';

export interface PlatformBrandInfo {
  name: string;
  shortName: string;
  logoUrl?: string;
  brandColor: string;
  textColor: string;
  iconFallback: string;
}

interface BrandEntry {
  keywords: string[];
  domain: string;
  /** Title search inside the platform; `{q}` is replaced by the URL-encoded query. */
  searchUrlTemplate?: string;
  shortName: string;
  brandColor: string;
  textColor: string;
  iconFallback: string;
  /** Group shown in the profile platforms picker; entries without a group are not offered there. */
  group?: PlatformGroup;
}

// Resolution takes the first matching entry, so specific brands go before generic ones
// (e.g. "Apple Music" before "Apple TV+", "Xbox Game Pass" before "Xbox").
const BRAND_CATALOG: BrandEntry[] = [
  {
    keywords: ['google play books', 'google play libros'],
    domain: 'play.google.com',
    searchUrlTemplate: 'https://play.google.com/store/search?q={q}&c=books',
    shortName: 'Google Play Books',
    brandColor: '#4285F4',
    textColor: '#FFFFFF',
    iconFallback: 'book',
    group: 'reading',
  },
  {
    keywords: ['apple music'],
    domain: 'music.apple.com',
    searchUrlTemplate: 'https://music.apple.com/search?term={q}',
    shortName: 'Apple Music',
    brandColor: '#FA243C',
    textColor: '#FFFFFF',
    iconFallback: 'musical-notes',
    group: 'music',
  },
  {
    keywords: ['apple books', 'ibooks'],
    domain: 'books.apple.com',
    shortName: 'Apple Books',
    brandColor: '#FF9500',
    textColor: '#FFFFFF',
    iconFallback: 'book',
    group: 'reading',
  },
  {
    keywords: ['apple arcade'],
    domain: 'apple.com',
    shortName: 'Apple Arcade',
    brandColor: '#1C1C1E',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['amazon music'],
    domain: 'music.amazon.com',
    searchUrlTemplate: 'https://music.amazon.com/search/{q}',
    shortName: 'Amazon Music',
    brandColor: '#25D1DA',
    textColor: '#0F172A',
    iconFallback: 'musical-notes',
    group: 'music',
  },
  {
    keywords: ['youtube music'],
    domain: 'music.youtube.com',
    searchUrlTemplate: 'https://music.youtube.com/search?q={q}',
    shortName: 'YouTube Music',
    brandColor: '#FF0000',
    textColor: '#FFFFFF',
    iconFallback: 'musical-notes',
    group: 'music',
  },
  {
    keywords: ['youtube premium'],
    domain: 'youtube.com',
    shortName: 'YouTube Premium',
    brandColor: '#FF0000',
    textColor: '#FFFFFF',
    iconFallback: 'logo-youtube',
    group: 'video',
  },
  {
    keywords: ['kindle unlimited'],
    domain: 'amazon.com',
    searchUrlTemplate: 'https://www.amazon.com/s?k={q}&i=digital-text',
    shortName: 'Kindle Unlimited',
    brandColor: '#E67E22',
    textColor: '#FFFFFF',
    iconFallback: 'book-outline',
    group: 'reading',
  },
  {
    keywords: ['game pass', 'gamepass'],
    domain: 'xbox.com',
    shortName: 'Xbox Game Pass',
    brandColor: '#107C10',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['playstation plus', 'ps plus', 'ps+'],
    domain: 'playstation.com',
    shortName: 'PlayStation Plus',
    brandColor: '#003791',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['nintendo switch online'],
    domain: 'nintendo.com',
    shortName: 'Nintendo Switch Online',
    brandColor: '#E60012',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['rakuten tv'],
    domain: 'rakuten.tv',
    shortName: 'Rakuten TV',
    brandColor: '#BF0000',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['rakuten viki', 'viki'],
    domain: 'viki.com',
    shortName: 'Viki',
    brandColor: '#1E90FF',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['cinemax'],
    domain: 'cinemax.com',
    shortName: 'Cinemax',
    brandColor: '#1A1A1A',
    textColor: '#FFFFFF',
    iconFallback: 'film',
  },
  {
    keywords: ['netflix'],
    domain: 'netflix.com',
    searchUrlTemplate: 'https://www.netflix.com/search?q={q}',
    shortName: 'Netflix',
    brandColor: '#E50914',
    textColor: '#FFFFFF',
    iconFallback: 'film',
    group: 'video',
  },
  {
    keywords: ['prime video', 'amazon prime', 'amazon video'],
    domain: 'primevideo.com',
    searchUrlTemplate: 'https://www.primevideo.com/search?phrase={q}',
    shortName: 'Prime Video',
    brandColor: '#00A8E1',
    textColor: '#0F172A',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['disney', 'disney+'],
    domain: 'disneyplus.com',
    searchUrlTemplate: 'https://www.disneyplus.com/search?q={q}',
    shortName: 'Disney+',
    brandColor: '#113CCF',
    textColor: '#FFFFFF',
    iconFallback: 'sparkles',
    group: 'video',
  },
  {
    keywords: ['max', 'hbo max', 'hbo'],
    domain: 'max.com',
    searchUrlTemplate: 'https://play.max.com/search?q={q}',
    shortName: 'Max',
    brandColor: '#002BE7',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['apple tv', 'apple tv+', 'itunes', 'apple'],
    domain: 'apple.com',
    searchUrlTemplate: 'https://tv.apple.com/search?term={q}',
    shortName: 'Apple TV+',
    brandColor: '#1C1C1E',
    textColor: '#FFFFFF',
    iconFallback: 'logo-apple',
    group: 'video',
  },
  {
    keywords: ['paramount', 'paramount+'],
    domain: 'paramountplus.com',
    searchUrlTemplate: 'https://www.paramountplus.com/search/?q={q}',
    shortName: 'Paramount+',
    brandColor: '#0064FF',
    textColor: '#FFFFFF',
    iconFallback: 'film',
    group: 'video',
  },
  {
    keywords: ['crunchyroll'],
    domain: 'crunchyroll.com',
    searchUrlTemplate: 'https://www.crunchyroll.com/search?q={q}',
    shortName: 'Crunchyroll',
    brandColor: '#F47521',
    textColor: '#FFFFFF',
    iconFallback: 'flash',
    group: 'video',
  },
  {
    keywords: ['mangadex'],
    domain: 'mangadex.org',
    searchUrlTemplate: 'https://mangadex.org/search?q={q}',
    shortName: 'MangaDex',
    brandColor: '#FF6740',
    textColor: '#FFFFFF',
    iconFallback: 'book',
    group: 'reading',
  },
  {
    keywords: ['open library', 'internet archive'],
    domain: 'openlibrary.org',
    searchUrlTemplate: 'https://openlibrary.org/search?q={q}',
    shortName: 'Open Library',
    brandColor: '#006699',
    textColor: '#FFFFFF',
    iconFallback: 'library',
  },
  {
    keywords: ['kindle', 'amazon kindle'],
    domain: 'amazon.com',
    searchUrlTemplate: 'https://www.amazon.com/s?k={q}&i=digital-text',
    shortName: 'Kindle',
    brandColor: '#E67E22',
    textColor: '#FFFFFF',
    iconFallback: 'book-outline',
    group: 'reading',
  },
  {
    keywords: ['filmin'],
    domain: 'filmin.es',
    searchUrlTemplate: 'https://www.filmin.es/buscador?q={q}',
    shortName: 'Filmin',
    brandColor: '#00FF87',
    textColor: '#0F172A',
    iconFallback: 'videocam',
    group: 'video',
  },
  {
    keywords: ['movistar', 'movistar+'],
    domain: 'movistarplus.es',
    shortName: 'Movistar+',
    brandColor: '#0B2742',
    textColor: '#00E5FF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['star+', 'star plus'],
    domain: 'starplus.com',
    shortName: 'Star+',
    brandColor: '#FF5F00',
    textColor: '#FFFFFF',
    iconFallback: 'star',
    group: 'video',
  },
  {
    keywords: ['pluto tv', 'pluto'],
    domain: 'pluto.tv',
    shortName: 'Pluto TV',
    brandColor: '#FFE600',
    textColor: '#0F172A',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['vix'],
    domain: 'vix.com',
    shortName: 'ViX',
    brandColor: '#FF4500',
    textColor: '#FFFFFF',
    iconFallback: 'play',
    group: 'video',
  },
  {
    keywords: ['youtube'],
    domain: 'youtube.com',
    searchUrlTemplate: 'https://www.youtube.com/results?search_query={q}',
    shortName: 'YouTube',
    brandColor: '#FF0000',
    textColor: '#FFFFFF',
    iconFallback: 'logo-youtube',
    group: 'video',
  },
  {
    keywords: ['google play', 'google tv'],
    domain: 'tv.google',
    searchUrlTemplate: 'https://play.google.com/store/search?q={q}&c=movies',
    shortName: 'Google TV',
    brandColor: '#4285F4',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['kobo', 'rakuten kobo'],
    domain: 'kobo.com',
    searchUrlTemplate: 'https://www.kobo.com/search?query={q}',
    shortName: 'Kobo',
    brandColor: '#BF0000',
    textColor: '#FFFFFF',
    iconFallback: 'book',
    group: 'reading',
  },
  {
    keywords: ['animeflv'],
    domain: 'animeflv.net',
    shortName: 'AnimeFLV',
    brandColor: '#2B2D42',
    textColor: '#FFFFFF',
    iconFallback: 'flash',
  },
  {
    keywords: ['hidive'],
    domain: 'hidive.com',
    shortName: 'HIDIVE',
    brandColor: '#00B7FF',
    textColor: '#0F172A',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['skyshowtime'],
    domain: 'skyshowtime.com',
    shortName: 'SkyShowtime',
    brandColor: '#0B1E3F',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['mubi'],
    domain: 'mubi.com',
    searchUrlTemplate: 'https://mubi.com/search/films?query={q}',
    shortName: 'MUBI',
    brandColor: '#001489',
    textColor: '#FFFFFF',
    iconFallback: 'film',
    group: 'video',
  },
  {
    keywords: ['atresplayer'],
    domain: 'atresplayer.com',
    shortName: 'Atresplayer',
    brandColor: '#FF6A00',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['rtve play', 'rtve'],
    domain: 'rtve.es',
    shortName: 'RTVE Play',
    brandColor: '#E4002B',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['mitele', 'mediaset'],
    domain: 'mitele.es',
    shortName: 'Mitele',
    brandColor: '#00A3E0',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['flixolé', 'flixole'],
    domain: 'flixole.com',
    shortName: 'FlixOlé',
    brandColor: '#E30613',
    textColor: '#FFFFFF',
    iconFallback: 'film',
    group: 'video',
  },
  {
    keywords: ['hulu'],
    domain: 'hulu.com',
    searchUrlTemplate: 'https://www.hulu.com/search?q={q}',
    shortName: 'Hulu',
    brandColor: '#1CE783',
    textColor: '#0F172A',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['peacock'],
    domain: 'peacocktv.com',
    shortName: 'Peacock',
    brandColor: '#000000',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['tubi'],
    domain: 'tubitv.com',
    searchUrlTemplate: 'https://tubitv.com/search/{q}',
    shortName: 'Tubi',
    brandColor: '#7408FF',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['plex'],
    domain: 'plex.tv',
    shortName: 'Plex',
    brandColor: '#E5A00D',
    textColor: '#0F172A',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['twitch'],
    domain: 'twitch.tv',
    shortName: 'Twitch',
    brandColor: '#9146FF',
    textColor: '#FFFFFF',
    iconFallback: 'logo-twitch',
    group: 'video',
  },
  {
    keywords: ['claro video'],
    domain: 'clarovideo.com',
    shortName: 'Claro Video',
    brandColor: '#DA291C',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
    group: 'video',
  },
  {
    keywords: ['mercado play'],
    domain: 'mercadolibre.com',
    shortName: 'Mercado Play',
    brandColor: '#FFE600',
    textColor: '#0F172A',
    iconFallback: 'play',
    group: 'video',
  },
  {
    keywords: ['spotify'],
    domain: 'spotify.com',
    searchUrlTemplate: 'https://open.spotify.com/search/{q}',
    shortName: 'Spotify',
    brandColor: '#1DB954',
    textColor: '#0F172A',
    iconFallback: 'musical-notes',
    group: 'music',
  },
  {
    keywords: ['deezer'],
    domain: 'deezer.com',
    searchUrlTemplate: 'https://www.deezer.com/search/{q}',
    shortName: 'Deezer',
    brandColor: '#A238FF',
    textColor: '#FFFFFF',
    iconFallback: 'musical-notes',
    group: 'music',
  },
  {
    keywords: ['tidal'],
    domain: 'tidal.com',
    searchUrlTemplate: 'https://listen.tidal.com/search?q={q}',
    shortName: 'Tidal',
    brandColor: '#000000',
    textColor: '#FFFFFF',
    iconFallback: 'musical-notes',
    group: 'music',
  },
  {
    keywords: ['soundcloud'],
    domain: 'soundcloud.com',
    searchUrlTemplate: 'https://soundcloud.com/search?q={q}',
    shortName: 'SoundCloud',
    brandColor: '#FF5500',
    textColor: '#FFFFFF',
    iconFallback: 'musical-notes',
    group: 'music',
  },
  {
    keywords: ['ivoox'],
    domain: 'ivoox.com',
    shortName: 'iVoox',
    brandColor: '#F45A00',
    textColor: '#FFFFFF',
    iconFallback: 'mic',
    group: 'music',
  },
  {
    keywords: ['audible'],
    domain: 'audible.com',
    searchUrlTemplate: 'https://www.audible.com/search?keywords={q}',
    shortName: 'Audible',
    brandColor: '#F8991C',
    textColor: '#0F172A',
    iconFallback: 'headset',
    group: 'reading',
  },
  {
    keywords: ['storytel'],
    domain: 'storytel.com',
    shortName: 'Storytel',
    brandColor: '#FF501E',
    textColor: '#FFFFFF',
    iconFallback: 'headset',
    group: 'reading',
  },
  {
    keywords: ['scribd', 'everand'],
    domain: 'scribd.com',
    searchUrlTemplate: 'https://www.scribd.com/search?query={q}',
    shortName: 'Scribd',
    brandColor: '#1E7B85',
    textColor: '#FFFFFF',
    iconFallback: 'book',
    group: 'reading',
  },
  {
    keywords: ['manga plus', 'mangaplus'],
    domain: 'mangaplus.shueisha.co.jp',
    shortName: 'MANGA Plus',
    brandColor: '#E60012',
    textColor: '#FFFFFF',
    iconFallback: 'book',
    group: 'reading',
  },
  {
    keywords: ['webtoon'],
    domain: 'webtoons.com',
    searchUrlTemplate: 'https://www.webtoons.com/en/search?keyword={q}',
    shortName: 'Webtoon',
    brandColor: '#00DC64',
    textColor: '#0F172A',
    iconFallback: 'book',
    group: 'reading',
  },
  {
    keywords: ['ea play'],
    domain: 'ea.com',
    shortName: 'EA Play',
    brandColor: '#FF4747',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['ubisoft+', 'ubisoft plus', 'ubisoft'],
    domain: 'ubisoft.com',
    shortName: 'Ubisoft+',
    brandColor: '#0070FF',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['geforce now'],
    domain: 'nvidia.com',
    shortName: 'GeForce NOW',
    brandColor: '#76B900',
    textColor: '#0F172A',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['steam', 'valvesoftware'],
    domain: 'store.steampowered.com',
    searchUrlTemplate: 'https://store.steampowered.com/search/?term={q}',
    shortName: 'Steam',
    brandColor: '#171A21',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['playstation', 'ps store', 'psn', 'ps4', 'ps5'],
    domain: 'store.playstation.com',
    searchUrlTemplate: 'https://store.playstation.com/search/{q}',
    shortName: 'PlayStation',
    brandColor: '#003791',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['xbox', 'microsoft store'],
    domain: 'xbox.com',
    searchUrlTemplate: 'https://www.xbox.com/search?q={q}',
    shortName: 'Xbox',
    brandColor: '#107C10',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['nintendo', 'eshop', 'switch'],
    domain: 'nintendo.com',
    searchUrlTemplate: 'https://www.nintendo.com/us/search/?q={q}',
    shortName: 'Nintendo',
    brandColor: '#E60012',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['epic games', 'epic store'],
    domain: 'store.epicgames.com',
    searchUrlTemplate: 'https://store.epicgames.com/browse?q={q}',
    shortName: 'Epic Games',
    brandColor: '#2A2A2A',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
    group: 'games',
  },
  {
    keywords: ['gog', 'gog.com'],
    domain: 'gog.com',
    searchUrlTemplate: 'https://www.gog.com/games?query={q}',
    shortName: 'GOG',
    brandColor: '#8A2BE2',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
  },
];

export const getGstaticFaviconUrl = (domain: string, size: number = 128): string => {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=${size}`;
};

export const resolvePlatformBrand = (provider: StreamingProvider): PlatformBrandInfo => {
  const normalized = (provider.name || '').toLowerCase().trim();

  // Find matching entry in catalog
  const match = BRAND_CATALOG.find(entry =>
    entry.keywords.some(kw => normalized.includes(kw))
  );

  if (match) {
    return {
      name: provider.name,
      shortName: match.shortName,
      logoUrl: provider.logoUrl || getGstaticFaviconUrl(match.domain, 128),
      brandColor: provider.color || match.brandColor,
      textColor: match.textColor,
      iconFallback: match.iconFallback,
    };
  }

  // Fallback for custom or unknown platforms
  const isReading = provider.type === 'read';
  const isGame = provider.id?.includes('game') || provider.type === 'buy';
  return {
    name: provider.name,
    shortName: provider.name,
    logoUrl: provider.logoUrl,
    brandColor: provider.color || (isReading ? '#4338CA' : isGame ? '#2D3748' : '#1E293B'),
    textColor: '#F8FAFC',
    iconFallback: isReading ? 'book-outline' : isGame ? 'game-controller-outline' : 'tv-outline',
  };
};

export interface PlatformBranding {
  name: string;
  shortName: string;
  logoUrl?: string;
  color?: string;
  fallbackIcon: string;
}

export const resolvePlatformBranding = (
  name: string,
  logoUrl?: string,
  category?: string
): PlatformBranding => {
  const brand = resolvePlatformBrand({
    id: 'temp',
    name,
    logoUrl,
    type: category === 'book' || category === 'manga' ? 'read' : category === 'game' ? 'buy' : 'stream',
  });

  return {
    name: brand.name,
    shortName: brand.shortName,
    logoUrl: brand.logoUrl,
    color: brand.brandColor,
    fallbackIcon: category === 'game' ? 'game-controller-outline' : brand.iconFallback,
  };
};

export interface SubscriptionPlatformOption {
  name: string;
  group: PlatformGroup;
}

export const PLATFORM_GROUP_LABELS: Record<PlatformGroup, string> = {
  video: 'Cine y series',
  music: 'Música y podcasts',
  reading: 'Lectura y audiolibros',
  games: 'Videojuegos',
};

/** Known platforms the user can pick as subscriptions in their profile. */
export const SUBSCRIPTION_PLATFORMS: SubscriptionPlatformOption[] = BRAND_CATALOG.filter(
  (entry): entry is BrandEntry & { group: PlatformGroup } => Boolean(entry.group)
).map(entry => ({ name: entry.shortName, group: entry.group }));

const findBrand = (name: string): BrandEntry | undefined => {
  const normalized = name.toLowerCase().trim();
  if (!normalized) return undefined;
  return BRAND_CATALOG.find(entry => entry.keywords.some(kw => normalized.includes(kw)));
};

/** Catalog name of a platform (e.g. "HBO Max" -> "Max"), or the trimmed name if unknown. */
export const canonicalPlatformName = (name: string): string =>
  findBrand(name)?.shortName ?? name.trim().replace(/\s+/g, ' ');

/** Whether two platform names refer to the same service. */
export const isSamePlatform = (a: string, b: string): boolean => {
  const brandA = findBrand(a);
  const brandB = findBrand(b);
  if (brandA && brandB) return brandA === brandB;
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  return Boolean(x && y) && (x.includes(y) || y.includes(x));
};

/** URL that searches `query` inside the platform, or undefined when the platform has no known search page. */
export const getPlatformSearchUrl = (name: string, query: string): string | undefined => {
  const template = findBrand(name)?.searchUrlTemplate;
  const trimmed = query.trim();
  if (!template || !trimmed) return undefined;
  return template.replace('{q}', encodeURIComponent(trimmed));
};
