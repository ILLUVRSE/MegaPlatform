export interface ClusterRankingInput {
  publishedAt: Date;
  sourceDiversity: number;
  articleCount: number;
  category: 'global' | 'vertical' | 'local';
  sourceReputation?: number;
  personalizationMultiplier?: number;
}

const categoryBoosts: Record<'global' | 'vertical' | 'local', number> = {
  global: 1,
  vertical: 1.2,
  local: 1.15
};

export function recencyDecayScore(publishedAt: Date, now = new Date()): number {
  const hours = Math.max(1, (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60));
  return Math.exp(-hours / 24);
}

export function computeClusterScore(input: ClusterRankingInput): number {
  const recency = recencyDecayScore(input.publishedAt);
  const diversity = Math.min(1, input.sourceDiversity / 5);
  const volume = Math.min(1, input.articleCount / 10);
  const reputation = input.sourceReputation ?? 0.6;

  const base = 0.45 * recency + 0.25 * diversity + 0.15 * volume + 0.15 * reputation;
  const personalized = base * (input.personalizationMultiplier ?? 1);
  return Number((personalized * categoryBoosts[input.category]).toFixed(4));
}
