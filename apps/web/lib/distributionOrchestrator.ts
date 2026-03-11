export type DistributionCandidate = {
  id: string;
  type: "SHORT" | "MEME" | "WATCH_EPISODE" | "GAME";
  score: number;
};

export type PlannedDistributionAction = {
  module: string;
  targetType: string;
  targetId: string;
  actionType: string;
  priority: number;
  scheduledFor: Date;
  metadataJson: Record<string, unknown>;
};

export function planDistributionActions(candidates: DistributionCandidate[]): PlannedDistributionAction[] {
  const now = Date.now();
  return candidates.slice(0, 20).map((candidate, index) => {
    const module = candidate.type === "WATCH_EPISODE" ? "watch" : candidate.type === "GAME" ? "games" : "shorts";
    const actionType = candidate.type === "GAME" ? "feature_in_games" : "feature_in_home";
    return {
      module,
      targetType: candidate.type,
      targetId: candidate.id,
      actionType,
      priority: Math.max(1, Math.round(candidate.score * 10) - index),
      scheduledFor: new Date(now + index * 15 * 60 * 1000),
      metadataJson: {
        source: "distribution-orchestrator-v1",
        candidateScore: candidate.score,
        rank: index + 1
      }
    };
  });
}
