import { getOnlineFeatures } from "@/lib/intelligence/featureStore";

export type Candidate = {
  id: string;
  kind: "feed_post" | "short" | "game";
  baseScore: number;
};

export function scoreCandidatesForEntity(entityKey: string, candidates: Candidate[]) {
  const features = getOnlineFeatures(entityKey);
  const affinity = features.affinity_boost ?? 0;
  const freshness = features.freshness_boost ?? 0;

  return candidates
    .map((candidate) => ({
      ...candidate,
      score: Number((candidate.baseScore + affinity + freshness).toFixed(4))
    }))
    .sort((a, b) => b.score - a.score);
}
