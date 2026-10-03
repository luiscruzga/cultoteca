/**
 * Crea un AbortController que se aborta al vencer el timeout o cuando
 * se aborta la señal externa (p. ej. una búsqueda obsoleta).
 */
export const createTimeoutController = (timeoutMs: number, externalSignal?: AbortSignal) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return { controller, timeoutId };
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
