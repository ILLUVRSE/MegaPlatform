export type PersonalizationState = {
  updatedAt: number;
  preferences: Record<string, number>;
};

export type PersonalizationCacheSnapshot = {
  size: number;
  ttlMs: number;
  hits: number;
  misses: number;
  sets: number;
  evictions: {
    total: number;
    expired: number;
    manual: number;
  };
  recentKeys: Array<{
    operation: "set" | "hit" | "miss" | "expire" | "delete";
    key: string;
    at: string;
  }>;
};

const cache = new Map<string, PersonalizationState>();
const TTL_MS = 5 * 60 * 1000;
const RECENT_KEY_LIMIT = 10;

const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  evictions: {
    total: 0,
    expired: 0,
    manual: 0
  },
  recentKeys: [] as PersonalizationCacheSnapshot["recentKeys"]
};

function redactKey(key: string) {
  if (key.length <= 6) return `${key.slice(0, 1)}***`;
  return `${key.slice(0, 3)}***${key.slice(-2)}`;
}

function recordKeyEvent(operation: PersonalizationCacheSnapshot["recentKeys"][number]["operation"], key: string) {
  metrics.recentKeys.unshift({
    operation,
    key: redactKey(key),
    at: new Date().toISOString()
  });
  metrics.recentKeys = metrics.recentKeys.slice(0, RECENT_KEY_LIMIT);
}

export function setPersonalizationState(key: string, state: PersonalizationState) {
  cache.set(key, state);
  metrics.sets += 1;
  recordKeyEvent("set", key);
}

export function getPersonalizationState(key: string): PersonalizationState | null {
  const value = cache.get(key);
  if (!value) {
    metrics.misses += 1;
    recordKeyEvent("miss", key);
    return null;
  }
  if (Date.now() - value.updatedAt > TTL_MS) {
    cache.delete(key);
    metrics.misses += 1;
    metrics.evictions.total += 1;
    metrics.evictions.expired += 1;
    recordKeyEvent("expire", key);
    return null;
  }
  metrics.hits += 1;
  recordKeyEvent("hit", key);
  return value;
}

export function deletePersonalizationState(key: string) {
  if (!cache.delete(key)) return false;
  metrics.evictions.total += 1;
  metrics.evictions.manual += 1;
  recordKeyEvent("delete", key);
  return true;
}

export function getPersonalizationCacheSnapshot(): PersonalizationCacheSnapshot {
  return {
    size: cache.size,
    ttlMs: TTL_MS,
    hits: metrics.hits,
    misses: metrics.misses,
    sets: metrics.sets,
    evictions: {
      total: metrics.evictions.total,
      expired: metrics.evictions.expired,
      manual: metrics.evictions.manual
    },
    recentKeys: metrics.recentKeys.map((entry) => ({ ...entry }))
  };
}

export function resetPersonalizationCache() {
  cache.clear();
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.sets = 0;
  metrics.evictions.total = 0;
  metrics.evictions.expired = 0;
  metrics.evictions.manual = 0;
  metrics.recentKeys = [];
}
