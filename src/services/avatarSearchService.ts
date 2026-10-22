import {
  AvatarCategoryKey,
  DICEBEAR_AVATARS,
  FEATURED_SUPERHEROES,
  WIKI_TITLES,
} from '../constants/avatarPresets';
import { wikimediaFetch } from '../utils/remoteImage';

export interface AvatarSearchResult {
  id: string;
  name: string;
  category: AvatarCategoryKey | 'busqueda';
  url: string;
  source?: string;
}

export interface AvatarSearchOptions {
  /** Añade fotos de Wikimedia Commons (paisajes, lugares, objetos) para portadas. */
  includePhotos?: boolean;
}

const SOURCE_TIMEOUT_MS = 8000;
const SEARCH_PER_SOURCE = 12;
const AVATAR_THUMB_PX = 330; // Wikimedia solo sirve miniaturas en tamaños estándar (p. ej. 330, 500)
const PHOTO_THUMB_PX = 500;
const SUPERHERO_API = 'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/all.json';

const searchCache = new Map<string, AvatarSearchResult[]>();
const categoryCache = new Map<AvatarCategoryKey, AvatarSearchResult[]>();

type Source = () => Promise<AvatarSearchResult[]>;

/** URL sin los parámetros de seguimiento que Wikimedia añade a cada miniatura. */
const dedupeKey = (url: string) => url.replace(/[?&]utm_[a-z]+=[^&]*/g, '');

const withTimeout = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>(resolve => {
    timeoutId = setTimeout(() => resolve(fallback), SOURCE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/** Ejecuta las fuentes en paralelo; una fuente caída o lenta no anula a las demás. */
const runSources = async (sources: Source[]): Promise<AvatarSearchResult[]> => {
  const settled = await Promise.allSettled(sources.map(source => withTimeout(source(), [])));
  const seen = new Set<string>();
  const results: AvatarSearchResult[] = [];
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    for (const item of outcome.value) {
      const key = dedupeKey(item.url);
      if (!item.url || seen.has(key)) continue;
      seen.add(key);
      results.push(item);
    }
  }
  return results;
};

/** Intercala los resultados de cada fuente para que los primeros sean variados. */
const interleave = (groups: AvatarSearchResult[][]): AvatarSearchResult[] => {
  const result: AvatarSearchResult[] = [];
  const longest = Math.max(0, ...groups.map(group => group.length));
  for (let i = 0; i < longest; i++) {
    for (const group of groups) {
      if (group[i]) result.push(group[i]);
    }
  }
  return result;
};

const fetchJson = async (url: string, init?: RequestInit): Promise<any> => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

// ==========================================
// FUENTES
// ==========================================

const ANILIST_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
        id
        name { full }
        image { large medium }
      }
    }
  }
`;
const ANILIST_POPULAR_QUERY = `
  query ($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      characters(sort: FAVOURITES_DESC) {
        id
        name { full }
        image { large medium }
      }
    }
  }
`;

const aniList = (search: string | null, perPage: number, category: AvatarSearchResult['category']): Source => async () => {
  const json = await fetchJson('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: search ? ANILIST_QUERY : ANILIST_POPULAR_QUERY,
      variables: search ? { search, perPage } : { perPage },
    }),
  });
  return (json?.data?.Page?.characters || [])
    .filter((c: any) => (c.image?.large || c.image?.medium) && !/default\.jpg$/.test(c.image?.large || ''))
    .map((c: any) => ({
      id: `anilist-${c.id}`,
      name: c.name?.full || 'Personaje',
      category,
      url: c.image.large || c.image.medium,
      source: 'AniList',
    }));
};

const tvMazePeople = (query: string): Source => async () => {
  const list = await fetchJson(`https://api.tvmaze.com/search/people?q=${encodeURIComponent(query)}`);
  return (Array.isArray(list) ? list : [])
    .filter((item: any) => item?.person?.image?.medium || item?.person?.image?.original)
    .slice(0, SEARCH_PER_SOURCE)
    .map((item: any) => ({
      id: `tvmaze-${item.person.id}`,
      name: item.person.name,
      category: 'busqueda' as const,
      url: item.person.image.medium || item.person.image.original,
      source: 'TVMaze',
    }));
};

const tmdbKey = () => process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim() || '';

const tmdbPeople = (query: string | null, category: AvatarSearchResult['category']): Source => async () => {
  const key = tmdbKey();
  if (!key) return [];
  const url = query
    ? `https://api.themoviedb.org/3/search/person?api_key=${key}&language=es-ES&query=${encodeURIComponent(query)}`
    : `https://api.themoviedb.org/3/person/popular?api_key=${key}&language=es-ES`;
  const json = await fetchJson(url);
  return (json?.results || [])
    .filter((p: any) => p.profile_path)
    .slice(0, query ? SEARCH_PER_SOURCE : 20)
    .map((p: any) => ({
      id: `tmdb-person-${p.id}`,
      name: p.name,
      category,
      url: `https://image.tmdb.org/t/p/w185${p.profile_path}`,
      source: 'TMDB',
    }));
};

/** Búsqueda de texto completo en Wikipedia con la imagen principal de cada artículo. */
const wikipediaSearch = (query: string, lang: 'es' | 'en'): Source => async () => {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages` +
    `&piprop=thumbnail&pithumbsize=${AVATAR_THUMB_PX}&pilicense=any&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${SEARCH_PER_SOURCE}&gsrnamespace=0`;
  const response = await wikimediaFetch(url);
  if (!response.ok) return [];
  const pages = (await response.json())?.query?.pages;
  if (!pages) return [];
  return Object.values(pages)
    .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
    .filter((p: any) => p.thumbnail?.source)
    .map((p: any) => ({
      id: `wiki-${lang}-${p.pageid}`,
      name: p.title,
      category: 'busqueda' as const,
      url: p.thumbnail.source,
      source: 'Wikipedia',
    }));
};

/** Imágenes de una lista curada de artículos de en.wikipedia, en el orden de la lista. */
const wikipediaTitles = (titles: string[], category: AvatarCategoryKey, thumbPx: number): Source => async () => {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages' +
    `&piprop=thumbnail&pithumbsize=${thumbPx}&pilicense=any&pilimit=50&titles=${encodeURIComponent(titles.join('|'))}`;
  const response = await wikimediaFetch(url);
  if (!response.ok) return [];
  const query = (await response.json())?.query;
  if (!query?.pages) return [];
  // Título pedido → título final (normalizado y tras redirecciones), para conservar el orden curado
  const resolve = (title: string) => {
    let current = title;
    for (const step of [...(query.normalized || []), ...(query.redirects || [])]) {
      if (step.from === current) current = step.to;
    }
    return current;
  };
  const byTitle = new Map<string, any>(Object.values(query.pages).map((p: any) => [p.title, p]));
  return titles
    .map(title => byTitle.get(resolve(title)))
    .filter((p: any) => p?.thumbnail?.source)
    .map((p: any) => ({
      id: `wiki-en-${p.pageid}`,
      name: p.title.replace(/ \((character|Toy Story|Halo|God of War|Frozen|Stranger Things|musician|painting|Picasso|Klimt|Monet series|Van Gogh series|volcano|Minecraft|The Last of Us|Lilo & Stitch|The Legend of Zelda)\)$/, ''),
      category,
      url: p.thumbnail.source,
      source: 'Wikipedia',
    }));
};

/** Fotos de Wikimedia Commons (espacio de nombres File:). */
const commonsPhotos = (query: string): Source => async () => {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search' +
    `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=${SEARCH_PER_SOURCE * 2}` +
    `&prop=imageinfo&iiprop=url|mime&iiurlwidth=${PHOTO_THUMB_PX}`;
  const response = await wikimediaFetch(url);
  if (!response.ok) return [];
  const pages = (await response.json())?.query?.pages;
  if (!pages) return [];
  return Object.values(pages)
    .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
    .filter((p: any) => /^image\/(jpeg|png|webp)$/.test(p.imageinfo?.[0]?.mime || '') && p.imageinfo?.[0]?.thumburl)
    .map((p: any) => ({
      id: `commons-${p.pageid}`,
      name: p.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '),
      category: 'busqueda' as const,
      url: p.imageinfo[0].thumburl,
      source: 'Wikimedia Commons',
    }));
};

/** Artistas de Deezer (sin CORS: en web la petición falla y se ignora). */
const deezerArtists = (query: string | null, category: AvatarSearchResult['category']): Source => async () => {
  const url = query
    ? `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=${SEARCH_PER_SOURCE}`
    : 'https://api.deezer.com/chart/0/artists?limit=24';
  const json = await fetchJson(url);
  return (json?.data || [])
    .filter((a: any) => a.picture_big && !/\/artist\/\//.test(a.picture_big))
    .map((a: any) => ({
      id: `deezer-${a.id}`,
      name: a.name,
      category,
      url: a.picture_big,
      source: 'Deezer',
    }));
};

interface SuperheroEntry {
  id: number;
  name: string;
  fullName: string;
  publisher: string;
  image: string;
}

let superheroesPromise: Promise<SuperheroEntry[]> | null = null;

/** Lista completa de Superhero API (~900 KB): se descarga una vez y se guarda reducida. */
const loadSuperheroes = (): Promise<SuperheroEntry[]> => {
  if (!superheroesPromise) {
    superheroesPromise = fetchJson(SUPERHERO_API)
      .then((list: any[]) =>
        list
          .filter(h => h?.images?.md)
          .map(h => ({
            id: h.id,
            name: h.name,
            fullName: h.biography?.fullName || '',
            publisher: h.biography?.publisher || '',
            image: h.images.md,
          }))
      )
      .catch(error => {
        superheroesPromise = null;
        throw error;
      });
  }
  return superheroesPromise;
};

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const toSuperheroResult = (hero: SuperheroEntry, category: AvatarSearchResult['category']): AvatarSearchResult => ({
  id: `superhero-${hero.id}`,
  // En algunos registros `publisher` es un alias del personaje ("Superman Prime One-Million")
  name: /Comics$/.test(hero.publisher) ? `${hero.name} (${hero.publisher})` : hero.name,
  category,
  url: hero.image,
  source: 'Superhero API',
});

const superheroSearch = (query: string): Source => async () => {
  const needle = normalize(query);
  const heroes = await loadSuperheroes();
  return heroes
    .filter(h => normalize(h.name).includes(needle) || normalize(h.fullName).includes(needle))
    .slice(0, SEARCH_PER_SOURCE)
    .map(h => toSuperheroResult(h, 'busqueda'));
};

const featuredSuperheroes: Source = async () => {
  const heroes = await loadSuperheroes();
  // Hay variantes con el mismo nombre ("Superman" de otras editoriales): se prefiere DC/Marvel
  const findHero = (name: string) =>
    heroes.find(h => h.name === name && /^(DC|Marvel) Comics$/.test(h.publisher)) || heroes.find(h => h.name === name);
  return FEATURED_SUPERHEROES.map(findHero)
    .filter((h): h is SuperheroEntry => Boolean(h))
    .map(h => toSuperheroResult(h, 'comics'));
};

const rickAndMorty = (query: string | null, category: AvatarSearchResult['category']): Source => async () => {
  const url = query
    ? `https://rickandmortyapi.com/api/character/?name=${encodeURIComponent(query)}`
    : 'https://rickandmortyapi.com/api/character/?page=1';
  const response = await fetch(url);
  if (!response.ok) return []; // 404 cuando no hay coincidencias
  const json = await response.json();
  return (json?.results || []).slice(0, query ? SEARCH_PER_SOURCE : 20).map((c: any) => ({
    id: `rickmorty-${c.id}`,
    name: `${c.name} (Rick and Morty)`,
    category,
    url: c.image,
    source: 'Rick and Morty API',
  }));
};

const dicebear: Source = async () =>
  DICEBEAR_AVATARS.map(avatar => ({ ...avatar, category: 'graciosas' as const, source: 'DiceBear' }));

const curated = (category: AvatarCategoryKey, thumbPx = AVATAR_THUMB_PX): Source =>
  wikipediaTitles(WIKI_TITLES[category] || [], category, thumbPx);

/** Fuentes de cada categoría de la galería. */
const CATEGORY_SOURCES: Record<AvatarCategoryKey, Source[]> = {
  anime: [aniList(null, 36, 'anime')],
  cine_series: [curated('cine_series'), tmdbPeople(null, 'cine_series')],
  comics: [featuredSuperheroes, curated('comics')],
  musica: [curated('musica'), deezerArtists(null, 'musica')],
  animacion: [curated('animacion'), rickAndMorty(null, 'animacion')],
  videojuegos: [curated('videojuegos')],
  libros: [curated('libros')],
  historicos: [curated('historicos')],
  graciosas: [dicebear],
  paisajes: [curated('paisajes', PHOTO_THUMB_PX)],
  ciudades: [curated('ciudades', PHOTO_THUMB_PX)],
  arte: [curated('arte', PHOTO_THUMB_PX)],
  espacio: [curated('espacio', PHOTO_THUMB_PX)],
};

export const AvatarSearchService = {
  /** Imágenes de una categoría; se cachean en memoria solo si alguna fuente respondió. */
  async browse(category: AvatarCategoryKey): Promise<AvatarSearchResult[]> {
    const cached = categoryCache.get(category);
    if (cached) return cached;
    const results = await runSources(CATEGORY_SOURCES[category]);
    if (results.length > 0) categoryCache.set(category, results);
    return results;
  },

  /** Búsqueda libre en todas las fuentes: personajes, personas, artistas y (opcional) fotos. */
  async search(query: string, options: AvatarSearchOptions = {}): Promise<AvatarSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const cacheKey = `${options.includePhotos ? 'photos' : 'avatars'}::${trimmed.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const sources: Source[] = [
      wikipediaSearch(trimmed, 'es'),
      aniList(trimmed, SEARCH_PER_SOURCE, 'busqueda'),
      superheroSearch(trimmed),
      tmdbPeople(trimmed, 'busqueda'),
      wikipediaSearch(trimmed, 'en'),
      deezerArtists(trimmed, 'busqueda'),
      tvMazePeople(trimmed),
      rickAndMorty(trimmed, 'busqueda'),
      ...(options.includePhotos ? [commonsPhotos(trimmed)] : []),
    ];
    const groups = await Promise.all(sources.map(source => runSources([source])));
    // Con fotos, Commons va primero: en portadas suele ser lo que se busca
    const ordered = options.includePhotos ? [groups[groups.length - 1], ...groups.slice(0, -1)] : groups;
    const seen = new Set<string>();
    const results = interleave(ordered).filter(item => {
      const key = dedupeKey(item.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (results.length > 0) {
      searchCache.set(cacheKey, results);
      if (searchCache.size > 50) searchCache.delete(searchCache.keys().next().value as string);
    }
    return results;
  },
};
