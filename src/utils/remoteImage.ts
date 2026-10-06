import { ImageURISource, Platform } from 'react-native';
const appJson = require('../../app.json');

// Wikimedia rejects (HTTP 403) requests carrying Android's default `okhttp/x` User-Agent.
// See https://w.wiki/4wJS
const WIKIMEDIA_HOST = /^https?:\/\/([a-z0-9-]+\.)*(wikimedia|wikipedia|wikidata)\.org\//i;
const USER_AGENT = `Cultoteca/${appJson?.expo?.version || '1.0.0'} (${Platform.OS}; +https://cultoteca.app)`;

/** Image source for a remote URL, adding an identifiable User-Agent where the host requires it. */
export const remoteImageSource = (uri?: string | null): ImageURISource => {
  if (!uri) return { uri: undefined };
  if (Platform.OS !== 'web' && WIKIMEDIA_HOST.test(uri)) {
    return { uri, headers: { 'User-Agent': USER_AGENT } };
  }
  return { uri };
};

/**
 * Highest-resolution variant of a known provider image URL (for the enlarged viewer).
 * Unknown hosts are returned unchanged.
 */
export const getHighResImageUrl = (uri?: string | null): string | undefined => {
  if (!uri) return undefined;
  return uri
    // TMDB: /t/p/w500/... → /t/p/original/...
    .replace(/(image\.tmdb\.org\/t\/p\/)w\d+\//, '$1original/')
    // RAWG: /media/crop/600/400/... or /media/resize/640/-/... → /media/...
    .replace(/(media\.rawg\.io\/media\/)(?:crop\/\d+\/\d+|resize\/\d+\/-)\//, '$1')
    // iTunes artwork: 600x600bb → 1200x1200bb
    .replace(/(mzstatic\.com\/.+\/)\d+x\d+bb\./, (_, prefix) => `${prefix}1200x1200bb.`)
    // MangaDex covers: file.jpg.512.jpg → file.jpg
    .replace(/(uploads\.mangadex\.org\/covers\/.+?)\.(?:256|512)\.jpg$/, '$1');
};
