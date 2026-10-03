import { MediaItem, StreamingProvider } from '../../types';
import { searchViaProxy } from './searchProxyService';
import { searchWikidataEntities, WikidataEntity } from './wikidataService';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80';
const MAPS_LOGO = 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://maps.google.com&size=128';
const WIKIPEDIA_LOGO = 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wikipedia.org&size=128';
const OSM_LOGO = 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://openstreetmap.org&size=128';

/** Resultado normalizado de `/api/search/places` (OpenStreetMap Nominatim). */
interface OsmPlace {
  id: string;
  name: string;
  displayName: string;
  type: string;
  category: string;
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
  wikidata: string | null;
  website: string | null;
  image: string | null;
  osmUrl: string;
}

// Traducción de los tipos OSM más habituales; el resto se muestra tal cual
const OSM_TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurante',
  cafe: 'Cafetería',
  bar: 'Bar',
  pub: 'Pub',
  fast_food: 'Comida rápida',
  museum: 'Museo',
  gallery: 'Galería',
  attraction: 'Atracción turística',
  viewpoint: 'Mirador',
  park: 'Parque',
  theatre: 'Teatro',
  cinema: 'Cine',
  library: 'Biblioteca',
  place_of_worship: 'Lugar de culto',
  castle: 'Castillo',
  monument: 'Monumento',
  hotel: 'Hotel',
  beach: 'Playa',
  peak: 'Cumbre',
  city: 'Ciudad',
  town: 'Localidad',
  village: 'Pueblo',
  administrative: 'Área administrativa',
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const mapsUrlFor = (name: string, coordinates?: { lat: number; lon: number }) =>
  coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

const mapsProvider = (url: string): StreamingProvider => ({
  id: 'p-google-maps',
  name: 'Google Maps',
  type: 'read',
  color: '#4285F4',
  logoUrl: MAPS_LOGO,
  url,
});

const baseItem = () => ({
  category: 'place' as const,
  year: 0,
  averageRating: 0,
  ratingsCount: 0,
  isManualEntry: false,
  addedBy: {
    id: 'current-user',
    name: 'Tú',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  addedAt: new Date().toISOString(),
  comments: [],
});

const mapWikidataPlace = (entity: WikidataEntity): MediaItem => {
  const mapsUrl = mapsUrlFor(entity.label, entity.coordinates);
  const posterUrl = entity.imageUrl || PLACEHOLDER_IMAGE;
  const placeType = entity.types[0] ? capitalize(entity.types[0]) : 'Lugar';
  const country = entity.countries[0];

  const providers: StreamingProvider[] = [mapsProvider(mapsUrl)];
  const externalLinks = [{ label: 'Ver en Google Maps', url: mapsUrl }];
  if (entity.eswikiUrl) {
    providers.push({ id: 'p-wikipedia', name: 'Wikipedia', type: 'read', color: '#202124', logoUrl: WIKIPEDIA_LOGO, url: entity.eswikiUrl });
    externalLinks.push({ label: 'Artículo en Wikipedia', url: entity.eswikiUrl });
  }
  if (entity.website) externalLinks.push({ label: 'Web oficial', url: entity.website });

  return {
    ...baseItem(),
    id: `place-${entity.id}`,
    title: entity.label,
    director: country ? `${placeType} · ${country}` : placeType,
    cast: entity.coordinates ? [`${entity.coordinates.lat.toFixed(4)}, ${entity.coordinates.lon.toFixed(4)}`] : undefined,
    synopsis: entity.eswikiExtract || (entity.description ? `${entity.label}: ${entity.description}.` : `${placeType}: ${entity.label}.`),
    posterUrl,
    backdropUrl: posterUrl,
    genres: [placeType, ...(country ? [country] : [])],
    siteName: 'Wikidata / Maps',
    whereToWatchOrRead: providers,
    externalLinks,
  };
};

const mapOsmPlace = (place: OsmPlace): MediaItem => {
  const coordinates = { lat: place.lat, lon: place.lon };
  const mapsUrl = mapsUrlFor(place.name, coordinates);
  const placeType = OSM_TYPE_LABELS[place.type] || capitalize(place.type.replace(/_/g, ' '));
  const location = [place.city, place.country].filter(Boolean).join(', ');
  const posterUrl = place.image && /^https?:\/\//.test(place.image) ? place.image : PLACEHOLDER_IMAGE;

  const externalLinks = [
    { label: 'Ver en Google Maps', url: mapsUrl },
    { label: 'Ver en OpenStreetMap', url: place.osmUrl },
  ];
  if (place.website) externalLinks.push({ label: 'Web oficial', url: place.website });

  return {
    ...baseItem(),
    id: `osm-${place.id}`,
    title: place.name,
    director: location ? `${placeType} · ${location}` : placeType,
    cast: [`${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`],
    synopsis: `${placeType} en ${place.displayName}.`,
    posterUrl,
    backdropUrl: posterUrl,
    genres: [placeType, ...(place.country ? [place.country] : [])],
    siteName: 'OpenStreetMap / Maps',
    whereToWatchOrRead: [
      mapsProvider(mapsUrl),
      { id: 'p-osm', name: 'OpenStreetMap', type: 'read', color: '#7EBC6F', logoUrl: OSM_LOGO, url: place.osmUrl },
    ],
    externalLinks,
  };
};

/**
 * Wikidata (solo entidades con coordenadas, P625) aporta lugares notables con foto y resumen;
 * Nominatim (vía backend) completa con lugares no enciclopédicos como restaurantes o cafés.
 */
export const searchPlaces = async (query: string, limit: number = 8, signal?: AbortSignal): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const [wikidata, proxy] = await Promise.allSettled([
    searchWikidataEntities(cleanQuery, {
      requiredProperty: 'P625',
      fields: ['coordinates', 'country'],
      limit,
      signal,
    }),
    searchViaProxy<OsmPlace>('places', cleanQuery, limit, signal),
  ]);

  const entities = wikidata.status === 'fulfilled' ? wikidata.value : [];
  const osmPlaces = proxy.status === 'fulfilled' && proxy.value ? proxy.value.results : [];
  if (wikidata.status === 'rejected' && osmPlaces.length === 0) throw wikidata.reason;

  // OSM enlaza muchos lugares a su QID: si ya vino de Wikidata se descarta el duplicado
  const knownQids = new Set(entities.map(entity => entity.id));
  const seenOsm = new Set<string>();
  const extraPlaces = osmPlaces.filter(place => {
    if (place.wikidata && knownQids.has(place.wikidata)) return false;
    const key = place.wikidata || `${place.name.toLowerCase()}|${place.city || ''}`;
    if (seenOsm.has(key)) return false;
    seenOsm.add(key);
    return true;
  });

  // Se reserva hasta un tercio de los huecos a OSM para que los lugares locales no queden ocultos
  const osmSlots = Math.min(extraPlaces.length, Math.ceil(limit / 3));
  const wikidataCount = Math.min(entities.length, limit - osmSlots);
  return [
    ...entities.slice(0, wikidataCount).map(mapWikidataPlace),
    ...extraPlaces.slice(0, limit - wikidataCount).map(mapOsmPlace),
  ];
};
