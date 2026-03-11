export interface StageBudget {
  stage: string;
  maxTokens: number;
}

export const defaultBudgets: StageBudget[] = [
  { stage: 'summarize_cluster_queue', maxTokens: 2500 },
  { stage: 'podcast_script_queue', maxTokens: 3500 },
  { stage: 'weekly_digest_queue', maxTokens: 5000 }
];

export function shouldSkipByBudget(stage: string, tokensUsed: number): boolean {
  const budget = defaultBudgets.find((item) => item.stage === stage);
  if (!budget) {
    return false;
  }
  return tokensUsed > budget.maxTokens;
}

export function estimateCost(tokensUsed: number, perThousand = 0.003): number {
  return Number(((tokensUsed / 1000) * perThousand).toFixed(6));
}
