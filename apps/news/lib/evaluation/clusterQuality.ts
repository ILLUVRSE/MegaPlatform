export interface ClusterQualityInput {
  articleCount: number;
  sourceCount: number;
  similaritySpread: number;
}

export interface EvaluatedScore {
  score: number;
  metadata: Record<string, number | string>;
}

export function evaluateClusterQuality(input: ClusterQualityInput): EvaluatedScore {
  const base = Math.min(1, input.articleCount / 5);
  const sourcePenalty = input.sourceCount <= 1 ? 0.3 : 0;
  const overMergePenalty = input.similaritySpread > 0.65 ? 0.25 : 0;
  const score = Math.max(0, Number((base - sourcePenalty - overMergePenalty).toFixed(4)));

  return {
    score,
    metadata: {
      articleCount: input.articleCount,
      sourceCount: input.sourceCount,
      similaritySpread: input.similaritySpread,
      sourcePenalty,
      overMergePenalty
    }
  };
}
