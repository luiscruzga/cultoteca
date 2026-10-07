import { MongoDbService } from '../mongoDbService';

/**
 * Cliente de los endpoints `/api/search/*` del backend, que encapsulan proveedores
 * con secretos o políticas de servidor (BoardGameGeek, Ludopedia, Nominatim) y los ratings de BGG.
 * Devuelve `null` sin sesión verificada, con el backend caído o si no responde a tiempo,
 * para que cada categoría siga con sus proveedores sin clave.
 */

export type SearchProxyEndpoint = 'boardgames' | 'places';

export interface SearchProxyResponse<T> {
  configured: boolean;
  results: T[];
  error?: string;
}

const PROXY_TIMEOUT_MS = 6000;

/**
 * Petición GET a un endpoint del proxy. `request()` no acepta AbortSignal: se compite contra
 * el abort y un timeout propio para no retener una búsqueda obsoleta; la petición en vuelo
 * expira por su propio timeout.
 */
export const requestBackend = async <R>(
  path: string,
  signal?: AbortSignal,
  timeoutMs: number = PROXY_TIMEOUT_MS
): Promise<R | null> => {
  if (signal?.aborted) return null;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<null>(resolve => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
    onAbort = () => resolve(null);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

  try {
    return await Promise.race([MongoDbService.request<R>(path), cancelled]);
  } finally {
    clearTimeout(timeoutId);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
};

export const requestViaProxy = <T>(
  path: string,
  signal?: AbortSignal,
  timeoutMs: number = PROXY_TIMEOUT_MS
): Promise<SearchProxyResponse<T> | null> => requestBackend<SearchProxyResponse<T>>(path, signal, timeoutMs);

export const searchViaProxy = <T>(
  endpoint: SearchProxyEndpoint,
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<SearchProxyResponse<T> | null> =>
  requestViaProxy<T>(`/api/search/${endpoint}?q=${encodeURIComponent(query)}&limit=${limit}`, signal);
