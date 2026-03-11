export interface InteractionRecord {
  interactionType: 'view' | 'save' | 'skip' | 'listen';
  clusterCategory: 'global' | 'vertical' | 'local';
}

const weights: Record<InteractionRecord['interactionType'], number> = {
  view: 1,
  save: 2,
  skip: -1,
  listen: 1.5
};

export function buildInterestVector(records: InteractionRecord[]): Record<'global' | 'vertical' | 'local', number> {
  const vector = { global: 0, vertical: 0, local: 0 };
  for (const record of records) {
    vector[record.clusterCategory] += weights[record.interactionType];
  }
  return vector;
}

export function personalizationMultiplier(
  vector: Record<'global' | 'vertical' | 'local', number>,
  category: 'global' | 'vertical' | 'local'
): number {
  const max = Math.max(1, Math.abs(vector.global), Math.abs(vector.vertical), Math.abs(vector.local));
  return Number((1 + 0.2 * (vector[category] / max)).toFixed(4));
}
