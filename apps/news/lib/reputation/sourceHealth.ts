export interface SourceHealthInput {
  duplicateRate: number;
  averageLagHours: number;
  sourceDiversity: number;
}

export function scoreSourceHealth(input: SourceHealthInput): {
  accuracyScore: number;
  recencyScore: number;
  diversityScore: number;
  biasScore: number;
  aggregate: number;
} {
  const accuracyScore = Number(Math.max(0, 1 - input.duplicateRate).toFixed(4));
  const recencyScore = Number(Math.max(0, 1 - input.averageLagHours / 48).toFixed(4));
  const diversityScore = Number(Math.min(1, input.sourceDiversity / 10).toFixed(4));
  const biasScore = 0.5;
  const aggregate = Number((0.4 * accuracyScore + 0.3 * recencyScore + 0.2 * diversityScore + 0.1 * (1 - biasScore)).toFixed(4));

  return { accuracyScore, recencyScore, diversityScore, biasScore, aggregate };
}
