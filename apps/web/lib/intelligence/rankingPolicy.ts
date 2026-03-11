export type RankingPolicy = {
  name: string;
  weights: {
    recency: number;
    engagement: number;
    editorial: number;
    trustPenalty: number;
  };
};

export const DEFAULT_RANKING_POLICY: RankingPolicy = {
  name: "default-v1",
  weights: {
    recency: 1,
    engagement: 1,
    editorial: 1,
    trustPenalty: 1
  }
};

export function applyRankingPolicy(
  policy: RankingPolicy,
  input: { recency: number; engagement: number; editorial: number; trustPenalty: number }
) {
  const { weights } = policy;
  return (
    input.recency * weights.recency +
    input.engagement * weights.engagement +
    input.editorial * weights.editorial -
    input.trustPenalty * weights.trustPenalty
  );
}
