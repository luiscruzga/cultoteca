import { Platform } from 'react-native';
import { createTimeoutController } from './requestController';

/**
 * Búsqueda estructurada en Wikidata compartida por lugares y juegos de mesa.
 *
 * Flujo (3 peticiones):
 * 1. `list=search` con filtro `haswbstatement` → QIDs candidatos.
 * 2. SPARQL con solo las propiedades necesarias (≈8 KB frente a ≈850 KB de `wbgetentities` completo).
 *    Si SPARQL falla, se recurre a `wbgetentities` reducido (etiquetas, descripción y enlace a eswiki).
 * 3. Extractos introductorios e imagen de es.wikipedia para los que tienen artículo.
 */

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
const ESWIKI_API = 'https://es.wikipedia.org/w/api.php';
const ESWIKI_ARTICLE_PREFIX = 'https://es.wikipedia.org/wiki/';
const REQUEST_TIMEOUT_MS = 6000;
const CANDIDATES_PER_RESULT = 2;
const MAX_CANDIDATES = 12;

const CLIENT_USER_AGENT = 'Cultoteca/1.0 (mobile app)';

// Wikimedia pide identificar a los clientes. `Api-User-Agent` es la cabecera permitida desde navegadores;
// en nativo además se fija `User-Agent`, porque el servicio SPARQL responde 403 al genérico de Android (okhttp).
const WIKIMEDIA_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Api-User-Agent': CLIENT_USER_AGENT,
  ...(Platform.OS === 'web' ? {} : { 'User-Agent': CLIENT_USER_AGENT }),
};

export interface WikidataEntity {
  id: string;
  label: string;
  description?: string;
  sitelinks: number;
  imageUrl?: string;
  coordinates?: { lat: number; lon: number };
  countries: string[];
  types: string[];
  designers: string[];
  website?: string;
  eswikiUrl?: string;
  eswikiExtract?: string;
  minPlayers?: number;
  maxPlayers?: number;
  durationMinutes?: number;
  year?: number;
  bggId?: string;
}

/** Propiedades opcionales que se piden por SPARQL según la categoría. */
export type WikidataField = 'coordinates' | 'country' | 'players' | 'duration' | 'date' | 'bgg' | 'designers';

export interface WikidataSearchOptions {
  /** Filtro de CirrusSearch, p. ej. `P625` (coordenadas) o `P2339` (ID de BoardGameGeek). */
  requiredProperty: string;
  fields: WikidataField[];
  limit: number;
  signal?: AbortSignal;
}

const fetchJson = async (url: string, signal: AbortSignal, accept?: string): Promise<any> => {
  const response = await fetch(url, {
    signal,
    headers: accept ? { ...WIKIMEDIA_HEADERS, Accept: accept } : WIKIMEDIA_HEADERS,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url.split('?')[0]}`);
  return response.json();
};

/** Imagen redimensionada de Wikimedia Commons a partir de la URL `Special:FilePath` o del nombre de fichero. */
export const commonsImageUrl = (fileOrUrl: string, width = 600): string => {
  const fileName = decodeURIComponent(fileOrUrl.split('/Special:FilePath/').pop() || fileOrUrl);
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`;
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const searchCandidateIds = async (query: string, requiredProperty: string, limit: number, signal: AbortSignal) => {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    format: 'json',
    origin: '*',
    uselang: 'es',
    srsearch: `${query} haswbstatement:${requiredProperty}`,
    srlimit: String(limit),
    srprop: '',
  });
  const data = await fetchJson(`${WIKIDATA_API}?${params}`, signal);
  return ((data?.query?.search || []) as { title: string }[]).map(result => result.title);
};

const buildSparql = (ids: string[], fields: WikidataField[]) => {
  const has = (field: WikidataField) => fields.includes(field);
  const optional: string[] = [
    'OPTIONAL { ?item wdt:P18 ?image }',
    'OPTIONAL { ?item wdt:P31 ?type }',
    'OPTIONAL { ?item wdt:P856 ?website }',
    'OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://es.wikipedia.org/> }',
  ];
  const vars = ['?image', '?typeLabel', '?website', '?article'];

  if (has('coordinates')) { optional.push('OPTIONAL { ?item wdt:P625 ?coord }'); vars.push('?coord'); }
  if (has('country')) { optional.push('OPTIONAL { ?item wdt:P17 ?country }'); vars.push('?countryLabel'); }
  if (has('players')) {
    optional.push('OPTIONAL { ?item wdt:P1872 ?minPlayers }', 'OPTIONAL { ?item wdt:P1873 ?maxPlayers }');
    vars.push('?minPlayers', '?maxPlayers');
  }
  if (has('duration')) { optional.push('OPTIONAL { ?item wdt:P2047 ?duration }'); vars.push('?duration'); }
  if (has('date')) { optional.push('OPTIONAL { ?item wdt:P577 ?date }'); vars.push('?date'); }
  if (has('bgg')) { optional.push('OPTIONAL { ?item wdt:P2339 ?bgg }'); vars.push('?bgg'); }
  if (has('designers')) { optional.push('OPTIONAL { ?item wdt:P287 ?designer }'); vars.push('?designerLabel'); }

  return `SELECT ?item ?itemLabel ?itemDescription ?sitelinks ${vars.join(' ')} WHERE {
  VALUES ?item { ${ids.map(id => `wd:${id}`).join(' ')} }
  ?item wikibase:sitelinks ?sitelinks .
  ${optional.join('\n  ')}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en,mul". }
}`;
};

const parseCoordinates = (wkt?: string) => {
  const match = wkt?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  return match ? { lon: Number(match[1]), lat: Number(match[2]) } : undefined;
};

const toPositiveNumber = (value?: string) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// Las etiquetas sin traducción vuelven como el propio QID ("Q12345"): se descartan
const isRealLabel = (value?: string) => Boolean(value && !/^Q\d+$/.test(value));

const pushUnique = (list: string[], value?: string) => {
  if (isRealLabel(value) && !list.includes(value as string)) list.push(value as string);
};

/** Agrupa las filas SPARQL (una por combinación de valores múltiples) en una entidad por QID. */
const mergeSparqlRows = (bindings: any[]): Map<string, WikidataEntity> => {
  const entities = new Map<string, WikidataEntity>();
  for (const row of bindings) {
    const value = (key: string): string | undefined => row[key]?.value;
    const id = (value('item') || '').split('/').pop();
    if (!id) continue;

    let entity = entities.get(id);
    if (!entity) {
      const article = value('article');
      const year = value('date') ? new Date(value('date') as string).getUTCFullYear() : undefined;
      entity = {
        id,
        label: isRealLabel(value('itemLabel')) ? (value('itemLabel') as string) : id,
        description: value('itemDescription'),
        sitelinks: Number(value('sitelinks')) || 0,
        imageUrl: value('image') ? commonsImageUrl(value('image') as string) : undefined,
        coordinates: parseCoordinates(value('coord')),
        countries: [],
        types: [],
        designers: [],
        website: value('website'),
        eswikiUrl: article,
        minPlayers: toPositiveNumber(value('minPlayers')),
        maxPlayers: toPositiveNumber(value('maxPlayers')),
        durationMinutes: toPositiveNumber(value('duration')),
        year: year && Number.isFinite(year) ? year : undefined,
        bggId: value('bgg'),
      };
      entities.set(id, entity);
    }
    pushUnique(entity.countries, value('countryLabel'));
    pushUnique(entity.types, value('typeLabel'));
    pushUnique(entity.designers, value('designerLabel'));
  }
  return entities;
};

const fetchEswikiExtracts = async (entities: WikidataEntity[], signal: AbortSignal) => {
  const titleToEntity = new Map<string, WikidataEntity>();
  for (const entity of entities) {
    if (!entity.eswikiUrl) continue;
    const title = decodeURIComponent(entity.eswikiUrl.slice(ESWIKI_ARTICLE_PREFIX.length)).replace(/_/g, ' ');
    titleToEntity.set(title, entity);
  }
  if (titleToEntity.size === 0) return;

  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|pageimages',
    piprop: 'thumbnail',
    pithumbsize: '600',
    pilimit: 'max',
    exintro: '1',
    explaintext: '1',
    exlimit: 'max',
    exsentences: '4',
    format: 'json',
    origin: '*',
    redirects: '1',
    titles: Array.from(titleToEntity.keys()).join('|'),
  });
  const data = await fetchJson(`${ESWIKI_API}?${params}`, signal);
  const normalized = new Map<string, string>();
  for (const step of [...(data?.query?.normalized || []), ...(data?.query?.redirects || [])]) {
    normalized.set(step.to, normalized.get(step.from) || step.from);
  }
  for (const page of Object.values(data?.query?.pages || {}) as any[]) {
    const entity = titleToEntity.get(normalized.get(page.title) || page.title);
    if (!entity) continue;
    if (page.extract) entity.eswikiExtract = page.extract.trim();
    // La imagen principal del artículo cubre las entidades sin P18
    if (!entity.imageUrl && page.thumbnail?.source) entity.imageUrl = page.thumbnail.source;
  }
};

/** Respaldo si SPARQL no está disponible: datos mínimos sin propiedades estructuradas. */
const fetchBasicEntities = async (ids: string[], signal: AbortSignal): Promise<Map<string, WikidataEntity>> => {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|descriptions|sitelinks/urls',
    languages: 'es|en',
    languagefallback: '1',
    sitefilter: 'eswiki',
    format: 'json',
    origin: '*',
  });
  const data = await fetchJson(`${WIKIDATA_API}?${params}`, signal);
  const entities = new Map<string, WikidataEntity>();
  for (const raw of Object.values(data?.entities || {}) as any[]) {
    if (!raw?.id || raw.missing !== undefined) continue;
    entities.set(raw.id, {
      id: raw.id,
      label: raw.labels?.es?.value || raw.labels?.en?.value || raw.id,
      description: raw.descriptions?.es?.value || raw.descriptions?.en?.value,
      sitelinks: 0,
      countries: [],
      types: [],
      designers: [],
      eswikiUrl: raw.sitelinks?.eswiki?.url,
    });
  }
  return entities;
};

/**
 * Ordena por relevancia combinada: la posición en la búsqueda pesa,
 * pero una entidad mucho más notoria (más sitelinks) puede adelantar a homónimos menores.
 */
const rankEntities = (entities: WikidataEntity[], candidateIds: string[], query: string) => {
  const target = normalize(query);
  const score = (entity: WikidataEntity) =>
    Math.log1p(entity.sitelinks) -
    0.25 * candidateIds.indexOf(entity.id) +
    (normalize(entity.label) === target ? 1 : 0);
  return [...entities].sort((a, b) => score(b) - score(a));
};

export const searchWikidataEntities = async (
  query: string,
  { requiredProperty, fields, limit, signal }: WikidataSearchOptions
): Promise<WikidataEntity[]> => {
  const { controller, timeoutId } = createTimeoutController(REQUEST_TIMEOUT_MS, signal);
  try {
    const candidateIds = await searchCandidateIds(
      query,
      requiredProperty,
      Math.min(limit * CANDIDATES_PER_RESULT, MAX_CANDIDATES),
      controller.signal
    );
    if (candidateIds.length === 0) return [];

    let merged: Map<string, WikidataEntity>;
    try {
      const sparqlUrl = `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(buildSparql(candidateIds, fields))}`;
      const sparql = await fetchJson(sparqlUrl, controller.signal, 'application/sparql-results+json');
      merged = mergeSparqlRows(sparql?.results?.bindings || []);
    } catch (error) {
      if (controller.signal.aborted) throw error;
      console.warn('SPARQL de Wikidata no disponible, usando datos básicos:', error);
      merged = await fetchBasicEntities(candidateIds, controller.signal);
    }
    const ranked = rankEntities(Array.from(merged.values()), candidateIds, query).slice(0, limit);

    try {
      await fetchEswikiExtracts(ranked, controller.signal);
    } catch (error) {
      // Sin extractos se usa la descripción corta de Wikidata
      if (controller.signal.aborted) throw error;
      console.warn('No se pudieron obtener extractos de Wikipedia:', error);
    }

    return ranked;
  } finally {
    clearTimeout(timeoutId);
  }
};
