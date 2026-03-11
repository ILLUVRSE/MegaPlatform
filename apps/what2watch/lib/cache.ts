type CacheValue = {
  value: unknown;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheValue>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
