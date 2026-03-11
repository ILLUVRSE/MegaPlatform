export type FeatureVector = Record<string, number>;

const inMemoryOnlineFeatures = new Map<string, FeatureVector>();

export function upsertOnlineFeatures(entityKey: string, features: FeatureVector) {
  inMemoryOnlineFeatures.set(entityKey, { ...(inMemoryOnlineFeatures.get(entityKey) ?? {}), ...features });
}

export function getOnlineFeatures(entityKey: string): FeatureVector {
  return inMemoryOnlineFeatures.get(entityKey) ?? {};
}

export function clearOnlineFeatures() {
  inMemoryOnlineFeatures.clear();
}
