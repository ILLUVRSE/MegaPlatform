export type PersonalizationState = {
  updatedAt: number;
  preferences: Record<string, number>;
};

const cache = new Map<string, PersonalizationState>();
const TTL_MS = 5 * 60 * 1000;

export function setPersonalizationState(key: string, state: PersonalizationState) {
  cache.set(key, state);
}

export function getPersonalizationState(key: string): PersonalizationState | null {
  const value = cache.get(key);
  if (!value) return null;
  if (Date.now() - value.updatedAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return value;
}
