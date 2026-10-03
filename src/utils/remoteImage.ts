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
