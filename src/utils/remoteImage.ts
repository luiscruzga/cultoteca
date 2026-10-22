import { ImageURISource, Platform } from 'react-native';
const appJson = require('../../app.json');

// Wikimedia rejects (HTTP 403) requests carrying Android's default `okhttp/x` User-Agent.
// See https://w.wiki/4wJS
const WIKIMEDIA_HOST = /^https?:\/\/([a-z0-9-]+\.)*(wikimedia|wikipedia|wikidata)\.org\//i;
export const USER_AGENT = `Cultoteca/${appJson?.expo?.version || '1.0.0'} (${Platform.OS}; +https://cultoteca.app)`;

/**
 * Image source for a remote URL, adding an identifiable User-Agent where the host requires it.
 * The headed source is wrapped in an array: on Android, `Image` only forwards `headers` to the
 * native loader when `source` is an array (Image.android.js), so an object source drops them.
 */
export const remoteImageSource = (uri?: string | null): ImageURISource | ImageURISource[] => {
  if (!uri) return { uri: undefined };
  if (Platform.OS !== 'web' && WIKIMEDIA_HOST.test(uri)) {
    return [{ uri, headers: { 'User-Agent': USER_AGENT } }];
  }
  return { uri };
};

/** `fetch` that identifies the app to Wikimedia APIs, which reject Android's default User-Agent. */
export const wikimediaFetch = (url: string, init: RequestInit = {}): Promise<Response> =>
  fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(Platform.OS !== 'web' ? { 'User-Agent': USER_AGENT } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

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
