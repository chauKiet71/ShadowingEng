type CacheEntry<T> = {
  promise: Promise<T>;
  data?: T;
  at: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function peekCache<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

export function setCache<T>(key: string, data: T) {
  const promise = Promise.resolve(data);
  store.set(key, { promise, data, at: Date.now() });
}

export function invalidateCache(key: string | string[]) {
  const keys = Array.isArray(key) ? key : [key];
  for (const item of keys) {
    store.delete(item);
  }
}

export function invalidateCacheByPrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/** Deduplicated fetch with optional TTL. In-flight requests share one promise. */
export function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; force?: boolean },
): Promise<T> {
  const ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (!options?.force && existing) {
    if (existing.data !== undefined && Date.now() - existing.at < ttlMs) {
      return Promise.resolve(existing.data);
    }
    // Still in flight (no data yet) — reuse promise
    if (existing.data === undefined) {
      return existing.promise;
    }
  }

  const promise = fetcher()
    .then((data) => {
      store.set(key, { promise, data, at: Date.now() });
      return data;
    })
    .catch((error) => {
      const current = store.get(key);
      if (current?.promise === promise) {
        store.delete(key);
      }
      throw error;
    });

  store.set(key, { promise, at: Date.now(), data: existing?.data });
  return promise;
}
