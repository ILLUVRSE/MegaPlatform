interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 500;
const stats = {
  hits: 0,
  misses: 0,
  writes: 0,
  evictions: 0
};

function pruneExpiredEntries(now: number): void {
  for (const [key, item] of memoryCache.entries()) {
    if (now > item.expiresAt) {
      memoryCache.delete(key);
    }
  }
}

function evictOldestEntry(): void {
  let oldestKey: string | null = null;
  let oldestCreatedAt = Number.POSITIVE_INFINITY;

  for (const [key, item] of memoryCache.entries()) {
    if (item.createdAt < oldestCreatedAt) {
      oldestCreatedAt = item.createdAt;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    memoryCache.delete(oldestKey);
    stats.evictions += 1;
  }
}

export function getCached<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) {
    stats.misses += 1;
    return null;
  }
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    stats.misses += 1;
    return null;
  }
  stats.hits += 1;
  return item.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  const now = Date.now();
  pruneExpiredEntries(now);

  while (memoryCache.size >= MAX_CACHE_ENTRIES) {
    evictOldestEntry();
  }

  memoryCache.set(key, { value, createdAt: now, expiresAt: now + ttlMs });
  stats.writes += 1;
}

export function invalidateCached(prefix?: string): number {
  const keys = Array.from(memoryCache.keys());
  const targets = prefix ? keys.filter((key) => key.startsWith(prefix)) : keys;

  for (const key of targets) {
    memoryCache.delete(key);
  }
  return targets.length;
}

export function cacheSize(): number {
  return memoryCache.size;
}

export function getCacheStats(): {
  size: number;
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
  hitRate: number;
} {
  const lookups = stats.hits + stats.misses;
  return {
    size: memoryCache.size,
    hits: stats.hits,
    misses: stats.misses,
    writes: stats.writes,
    evictions: stats.evictions,
    hitRate: lookups === 0 ? 0 : Number((stats.hits / lookups).toFixed(4))
  };
}

export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.writes = 0;
  stats.evictions = 0;
}
