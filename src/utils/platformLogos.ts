import { StreamingProvider } from '../types';

export interface PlatformBrandInfo {
  name: string;
  shortName: string;
  logoUrl?: string;
  brandColor: string;
  textColor: string;
  iconFallback: string;
}

const BRAND_CATALOG: {
  keywords: string[];
  domain: string;
  shortName: string;
  brandColor: string;
  textColor: string;
  iconFallback: string;
}[] = [
  {
    keywords: ['netflix'],
    domain: 'netflix.com',
    shortName: 'Netflix',
    brandColor: '#E50914',
    textColor: '#FFFFFF',
    iconFallback: 'film',
  },
  {
    keywords: ['prime video', 'amazon prime', 'amazon video'],
    domain: 'primevideo.com',
    shortName: 'Prime Video',
    brandColor: '#00A8E1',
    textColor: '#0F172A',
    iconFallback: 'tv',
  },
  {
    keywords: ['disney', 'disney+'],
    domain: 'disneyplus.com',
    shortName: 'Disney+',
    brandColor: '#113CCF',
    textColor: '#FFFFFF',
    iconFallback: 'sparkles',
  },
  {
    keywords: ['max', 'hbo max', 'hbo'],
    domain: 'max.com',
    shortName: 'Max',
    brandColor: '#002BE7',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
  },
  {
    keywords: ['apple tv', 'apple tv+', 'itunes', 'apple'],
    domain: 'apple.com',
    shortName: 'Apple TV+',
    brandColor: '#1C1C1E',
    textColor: '#FFFFFF',
    iconFallback: 'logo-apple',
  },
  {
    keywords: ['paramount', 'paramount+'],
    domain: 'paramountplus.com',
    shortName: 'Paramount+',
    brandColor: '#0064FF',
    textColor: '#FFFFFF',
    iconFallback: 'film',
  },
  {
    keywords: ['crunchyroll'],
    domain: 'crunchyroll.com',
    shortName: 'Crunchyroll',
    brandColor: '#F47521',
    textColor: '#FFFFFF',
    iconFallback: 'flash',
  },
  {
    keywords: ['mangadex'],
    domain: 'mangadex.org',
    shortName: 'MangaDex',
    brandColor: '#FF6740',
    textColor: '#FFFFFF',
    iconFallback: 'book',
  },
  {
    keywords: ['open library', 'internet archive'],
    domain: 'openlibrary.org',
    shortName: 'Open Library',
    brandColor: '#006699',
    textColor: '#FFFFFF',
    iconFallback: 'library',
  },
  {
    keywords: ['kindle', 'amazon kindle'],
    domain: 'amazon.com',
    shortName: 'Kindle',
    brandColor: '#E67E22',
    textColor: '#FFFFFF',
    iconFallback: 'book-outline',
  },
  {
    keywords: ['filmin'],
    domain: 'filmin.es',
    shortName: 'Filmin',
    brandColor: '#00FF87',
    textColor: '#0F172A',
    iconFallback: 'videocam',
  },
  {
    keywords: ['movistar', 'movistar+'],
    domain: 'movistarplus.es',
    shortName: 'Movistar+',
    brandColor: '#0B2742',
    textColor: '#00E5FF',
    iconFallback: 'tv',
  },
  {
    keywords: ['star+', 'star plus'],
    domain: 'starplus.com',
    shortName: 'Star+',
    brandColor: '#FF5F00',
    textColor: '#FFFFFF',
    iconFallback: 'star',
  },
  {
    keywords: ['pluto tv', 'pluto'],
    domain: 'pluto.tv',
    shortName: 'Pluto TV',
    brandColor: '#FFE600',
    textColor: '#0F172A',
    iconFallback: 'tv',
  },
  {
    keywords: ['vix'],
    domain: 'vix.com',
    shortName: 'ViX',
    brandColor: '#FF4500',
    textColor: '#FFFFFF',
    iconFallback: 'play',
  },
  {
    keywords: ['youtube'],
    domain: 'youtube.com',
    shortName: 'YouTube',
    brandColor: '#FF0000',
    textColor: '#FFFFFF',
    iconFallback: 'logo-youtube',
  },
  {
    keywords: ['google play', 'google tv'],
    domain: 'tv.google',
    shortName: 'Google TV',
    brandColor: '#4285F4',
    textColor: '#FFFFFF',
    iconFallback: 'tv',
  },
  {
    keywords: ['kobo', 'rakuten kobo'],
    domain: 'kobo.com',
    shortName: 'Kobo',
    brandColor: '#BF0000',
    textColor: '#FFFFFF',
    iconFallback: 'book',
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
  },
  {
    keywords: ['steam', 'valvesoftware'],
    domain: 'store.steampowered.com',
    shortName: 'Steam',
    brandColor: '#171A21',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
  },
  {
    keywords: ['playstation', 'ps store', 'psn', 'ps4', 'ps5'],
    domain: 'store.playstation.com',
    shortName: 'PlayStation',
    brandColor: '#003791',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
  },
  {
    keywords: ['xbox', 'microsoft store'],
    domain: 'xbox.com',
    shortName: 'Xbox',
    brandColor: '#107C10',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
  },
  {
    keywords: ['nintendo', 'eshop', 'switch'],
    domain: 'nintendo.com',
    shortName: 'Nintendo',
    brandColor: '#E60012',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
  },
  {
    keywords: ['epic games', 'epic store'],
    domain: 'store.epicgames.com',
    shortName: 'Epic Games',
    brandColor: '#2A2A2A',
    textColor: '#FFFFFF',
    iconFallback: 'game-controller',
  },
  {
    keywords: ['gog', 'gog.com'],
    domain: 'gog.com',
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
