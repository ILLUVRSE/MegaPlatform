interface QueryCacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

const cache = new Map<string, QueryCacheEntry<unknown>>();
const MAX_ENTRIES = 300;

function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestCreatedAt = Number.POSITIVE_INFINITY;
  for (const [key, value] of cache.entries()) {
    if (value.createdAt < oldestCreatedAt) {
      oldestCreatedAt = value.createdAt;
      oldestKey = key;
    }
  }
  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

export function getQueryCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setQueryCache<T>(key: string, value: T, ttlMs: number): void {
  const now = Date.now();
  while (cache.size >= MAX_ENTRIES) {
    evictOldest();
  }
  cache.set(key, {
    value,
    createdAt: now,
    expiresAt: now + ttlMs
  });
}

export function clearQueryCache(): void {
  cache.clear();
}

export function queryCacheSize(): number {
  return cache.size;
}
