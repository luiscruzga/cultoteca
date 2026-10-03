import { MediaItem, StreamingProvider } from '../../types';
import { requestViaProxy, searchViaProxy } from './searchProxyService';
import { searchWikidataEntities, WikidataEntity } from './wikidataService';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&auto=format&fit=crop&q=80';
const faviconFor = (domain: string) =>
  `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
const RATINGS_TIMEOUT_MS = 2500;
const BGG_ATTRIBUTION = 'Valoración de la comunidad de BoardGameGeek.';

/** Resultado normalizado de `/api/search/boardgames` (BoardGameGeek XML API2 o Ludopedia). */
interface ProxyBoardGame {
  source: 'bgg' | 'ludopedia';
  id: string;
  bggId: string | null;
  name: string;
  localizedName?: string | null;
  year: number | null;
  description: string | null;
  image: string | null;
  thumbnail: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minAge: number | null;
  rating: number | null;
  ratingsCount: number | null;
  designers: string[];
  categories: string[];
  complexity: number | null;
  url: string;
}

/** Resultado de `/api/search/boardgame-ratings` (CSV de rankings de BGG). */
interface BggRating {
  bggId: string;
  rating: number;
  ratingsCount: number;
  rank: number | null;
}

// Misma normalización que el backend para cruzar nombres entre proveedores
const normalizeName = (name?: string | null) =>
  (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const formatPlayers = (min?: number | null, max?: number | null): string | undefined => {
  if (!min && !max) return undefined;
  if (min && max && min !== max) return `${min}-${max} jugadores`;
  const count = min || max;
  return `${count} ${count === 1 ? 'jugador' : 'jugadores'}`;
};

const formatDuration = (minutes?: number | null) => (minutes ? `${minutes} min` : undefined);

// BGG devuelve la descripción con entidades HTML escapadas dos veces (&amp;#10; → salto de línea)
const decodeBggText = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&#10;/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&rsquo;|&lsquo;/g, "'")
    .replace(/&mdash;|&ndash;/g, '-')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const bggUrlFor = (bggId: string | null | undefined, name: string) =>
  bggId
    ? `https://boardgamegeek.com/boardgame/${bggId}`
    : `https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${encodeURIComponent(name)}`;

const bggProvider = (url: string): StreamingProvider => ({
  id: 'p-bgg',
  name: 'BoardGameGeek',
  type: 'read',
  color: '#FF5100',
  logoUrl: faviconFor('boardgamegeek.com'),
  url,
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const withAttribution = (synopsis: string, hasBggRating: boolean) =>
  hasBggRating ? `${synopsis}\n\n${BGG_ATTRIBUTION}` : synopsis;

const baseItem = () => ({
  category: 'boardgame' as const,
  isManualEntry: false,
  addedBy: {
    id: 'current-user',
    name: 'Tú',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  addedAt: new Date().toISOString(),
  comments: [],
});

/** Sinopsis cuando el proveedor no trae descripción (Ludopedia) ni hay artículo en Wikipedia. */
const composeSynopsis = (game: ProxyBoardGame) => {
  const parts = [`${game.name} es un juego de mesa${game.year ? ` publicado en ${game.year}` : ''}.`];
  if (game.categories.length > 0) parts.push(`Categorías y mecánicas: ${game.categories.slice(0, 5).join(', ')}.`);
  if (game.complexity) parts.push(`Complejidad según la comunidad de Ludopedia: ${game.complexity.toFixed(1)}/5.`);
  return parts.join(' ');
};

const mapProxyGame = (game: ProxyBoardGame, wikidata?: WikidataEntity): MediaItem => {
  const details = [
    formatPlayers(game.minPlayers, game.maxPlayers),
    formatDuration(game.playingTime),
    game.minAge ? `+${game.minAge} años` : undefined,
  ].filter((value): value is string => Boolean(value));
  const posterUrl = game.image || game.thumbnail || wikidata?.imageUrl || PLACEHOLDER_IMAGE;
  const bggId = game.bggId || wikidata?.bggId;
  const bggUrl = bggUrlFor(bggId, game.name);
  const year = game.year || wikidata?.year;

  const providers: StreamingProvider[] = [];
  const externalLinks: { label: string; url: string }[] = [];
  if (game.source === 'ludopedia') {
    // Requisito de Ludopedia: citarla como fuente con enlace a la ficha
    providers.push({ id: 'p-ludopedia', name: 'Ludopedia', type: 'read', color: '#F2A900', logoUrl: faviconFor('ludopedia.com.br'), url: game.url });
    externalLinks.push({ label: 'Ficha en Ludopedia', url: game.url });
  }
  providers.push(bggProvider(bggUrl));
  externalLinks.push({ label: 'Ficha en BoardGameGeek', url: bggUrl });
  if (wikidata?.eswikiUrl) externalLinks.push({ label: 'Artículo en Wikipedia', url: wikidata.eswikiUrl });

  const synopsis = game.description ? decodeBggText(game.description) : wikidata?.eswikiExtract || composeSynopsis(game);
  const designers = game.designers.length > 0 ? game.designers : wikidata?.designers || [];

  return {
    ...baseItem(),
    id: `${game.source === 'bgg' ? 'bgg' : 'ludopedia'}-${game.id}`,
    title: game.name,
    originalTitle: game.localizedName || undefined,
    year: year || 0,
    releaseDate: year ? String(year) : undefined,
    director: designers.length > 0 ? `Diseño: ${designers.slice(0, 2).join(', ')}` : undefined,
    cast: details.length > 0 ? details : undefined,
    synopsis: withAttribution(synopsis, Boolean(game.rating)),
    posterUrl,
    backdropUrl: posterUrl,
    genres: game.categories.length > 0 ? game.categories.slice(0, 3) : ['Juego de Mesa'],
    averageRating: game.rating || 0,
    ratingsCount: game.ratingsCount || 0,
    whereToWatchOrRead: providers,
    externalLinks,
  };
};

const mapWikidataGame = (entity: WikidataEntity, rating?: BggRating): MediaItem => {
  const bggUrl = bggUrlFor(entity.bggId, entity.label);
  const details = [formatPlayers(entity.minPlayers, entity.maxPlayers), formatDuration(entity.durationMinutes)]
    .filter((value): value is string => Boolean(value));
  const posterUrl = entity.imageUrl || PLACEHOLDER_IMAGE;
  const genres = entity.types.length > 0 ? entity.types.slice(0, 3) : ['Juego de Mesa'];

  const providers: StreamingProvider[] = [bggProvider(bggUrl)];
  const externalLinks = [{ label: 'Ficha en BoardGameGeek', url: bggUrl }];
  if (entity.eswikiUrl) {
    providers.push({ id: 'p-wikipedia', name: 'Wikipedia', type: 'read', color: '#202124', logoUrl: faviconFor('wikipedia.org'), url: entity.eswikiUrl });
    externalLinks.push({ label: 'Artículo en Wikipedia', url: entity.eswikiUrl });
  }
  if (entity.website) externalLinks.push({ label: 'Web oficial', url: entity.website });

  const synopsis = entity.eswikiExtract || (entity.description ? `${entity.label}: ${entity.description}.` : `Juego de mesa: ${entity.label}.`);

  return {
    ...baseItem(),
    id: `boardgame-${entity.id}`,
    title: entity.label,
    year: entity.year || 0,
    releaseDate: entity.year ? String(entity.year) : undefined,
    director: entity.designers.length > 0 ? `Diseño: ${entity.designers.slice(0, 2).join(', ')}` : undefined,
    cast: details.length > 0 ? details : undefined,
    synopsis: withAttribution(synopsis, Boolean(rating)),
    posterUrl,
    backdropUrl: posterUrl,
    genres: genres.map(capitalize),
    averageRating: rating?.rating || 0,
    ratingsCount: rating?.ratingsCount || 0,
    whereToWatchOrRead: providers,
    externalLinks,
  };
};

/** Ratings de la comunidad de BGG (CSV del backend) para los resultados de Wikidata con ID de BGG. */
const fetchBggRatings = async (entities: WikidataEntity[], signal?: AbortSignal): Promise<Map<string, BggRating>> => {
  const ids = Array.from(new Set(entities.map(entity => entity.bggId).filter((id): id is string => Boolean(id)))).slice(0, 20);
  if (ids.length === 0) return new Map();
  const response = await requestViaProxy<BggRating>(
    `/api/search/boardgame-ratings?ids=${ids.join(',')}`,
    signal,
    RATINGS_TIMEOUT_MS
  );
  return new Map((response?.configured ? response.results : []).map(rating => [rating.bggId, rating]));
};

/** Entidad de Wikidata del mismo juego: por ID de BGG o, si no, por nombre normalizado. */
const findWikidataMatch = (game: ProxyBoardGame, entities: WikidataEntity[]) =>
  (game.bggId ? entities.find(entity => entity.bggId === game.bggId) : undefined) ||
  entities.find(entity => {
    const label = normalizeName(entity.label);
    return label === normalizeName(game.name) || (Boolean(game.localizedName) && label === normalizeName(game.localizedName));
  });

/**
 * Prioridad: proveedor del backend (BoardGameGeek con token o, si no, Ludopedia) → Wikidata,
 * limitado a entidades con ID de BGG (P2339). Wikidata se consulta siempre en paralelo: si el
 * backend no responde no hay espera, y aporta la sinopsis a los resultados de Ludopedia.
 */
export const searchBoardGames = async (query: string, limit: number = 8, signal?: AbortSignal): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const [proxy, wikidata] = await Promise.allSettled([
    searchViaProxy<ProxyBoardGame>('boardgames', cleanQuery, limit, signal),
    searchWikidataEntities(cleanQuery, {
      requiredProperty: 'P2339',
      fields: ['players', 'duration', 'date', 'bgg', 'designers'],
      limit,
      signal,
    }),
  ]);
  const entities = wikidata.status === 'fulfilled' ? wikidata.value : [];

  if (proxy.status === 'fulfilled' && proxy.value?.configured && proxy.value.results.length > 0) {
    return proxy.value.results.slice(0, limit).map(game => mapProxyGame(game, findWikidataMatch(game, entities)));
  }
  if (wikidata.status === 'rejected') throw wikidata.reason;

  const ratings = await fetchBggRatings(entities, signal);
  return entities.map(entity => mapWikidataGame(entity, entity.bggId ? ratings.get(entity.bggId) : undefined));
};
