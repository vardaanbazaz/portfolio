import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** After a failed fetch, a chunk is fetched again this many times, with this pause before each. */
export const CHUNK_RETRIES = 2;
export const CHUNK_RETRY_PAUSE_MS = 500;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `load`, and on failure runs it again up to `retries` times, pausing before each and passing it the last
 *  error. Rejects with the last error. */
export async function withRetries<T>(
  load: (lastError: unknown) => Promise<T>,
  retries = CHUNK_RETRIES,
  pauseMs = CHUNK_RETRY_PAUSE_MS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; ; attempt++) {
    try {
      return await load(lastError);
    } catch (error) {
      if (attempt >= retries) throw error;
      lastError = error;
      await pause(pauseMs);
    }
  }
}

/** Loads a chunk once: every call shares the fetch in flight or its result. A failure is forgotten, so the next call
 *  fetches again. */
export function once<T>(
  load: (lastError: unknown) => Promise<T>,
  retries = CHUNK_RETRIES,
  pauseMs = CHUNK_RETRY_PAUSE_MS,
): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () =>
    (pending ??= withRetries(load, retries, pauseMs).catch((error: unknown) => {
      pending = null;
      throw error;
    }));
}

/** The same-origin script an `import()` failed to fetch, as Chromium and Firefox name it in their error. */
export function failedScriptUrl(error: unknown, origin: string): string | undefined {
  const match = error instanceof Error ? /\bhttps?:\/\/\S+?\.js\b/.exec(error.message) : null;
  if (!match) return undefined;
  const url = new URL(match[0]);
  return url.origin === origin ? url.href : undefined;
}

let retryCount = 0;

/** Imports a chunk, and again on a retry. Chromium and Firefox remember a failed `import()` for the rest of the
 *  visit, so asking for the same URL again fails at once with no request. When the error names the chunk's file,
 *  the retry asks for that file with a query added, which is a new URL to the browser. */
function retryingImport<M>(importer: () => Promise<M>) {
  let failedUrl: string | undefined;
  return async (lastError: unknown): Promise<M> => {
    failedUrl = failedScriptUrl(lastError, window.location.origin) ?? failedUrl;
    try {
      return failedUrl ? ((await import(/* @vite-ignore */ `${failedUrl}?retry=${++retryCount}`)) as M) : await importer();
    } catch (error) {
      failedUrl = failedScriptUrl(error, window.location.origin) ?? failedUrl;
      throw error;
    }
  };
}

/** A component in its own chunk. `load` fetches it ahead of time; `Component` renders it, suspending until it has
 *  loaded. A lazy component that failed throws for good, so `retry` swaps in a new one that fetches again. */
export interface LazyChunk<P> {
  load: () => Promise<unknown>;
  readonly Component: LazyExoticComponent<ComponentType<P>>;
  retry: () => void;
}

export function lazyChunk<P>(importer: () => Promise<{ default: ComponentType<P> }>): LazyChunk<P> {
  const load = once(retryingImport(importer));
  let component = lazy(load);
  return {
    load,
    get Component() {
      return component;
    },
    retry() {
      component = lazy(load);
    },
  };
}

/** Starts a load nobody waits for. A failure is shown only when the chunk is opened, by its own load. */
export const prefetch = (load: () => Promise<unknown>) => void load().catch(() => {});

/** Runs `run` once the browser is idle, or after `timeoutMs` at the latest (a scene drawing every frame may leave
 *  it no idle time). Falls back to a timer where idle callbacks don't exist. */
export function whenIdle(run: () => void, timeoutMs = 2000) {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: timeoutMs });
  else setTimeout(run, 200);
}
