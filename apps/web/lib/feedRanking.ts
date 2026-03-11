import { WALL_RANKING_POLICY } from "@/lib/feedPolicy";

type WallScoreInput = {
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  featuredRank: number;
  unresolvedReports: number;
  affinityBoost: number;
};

export function scoreWallPost(input: WallScoreInput) {
  const ageHours = Math.max(0, (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60));
  const recency = Math.exp(-ageHours / WALL_RANKING_POLICY.recencyHalfLifeHours) * 6;
  const engagement = input.likeCount * 1.1 + input.commentCount * 1.7 + input.shareCount * 2.2;
  const editorial = (input.isPinned ? 4 : 0) + (input.isFeatured ? 2.5 + Math.max(0, 5 - input.featuredRank) * 0.4 : 0);
  const trustPenalty = input.unresolvedReports * WALL_RANKING_POLICY.unresolvedReportPenalty;

  return recency + engagement + editorial + input.affinityBoost - trustPenalty;
}

export function clampAffinityBoost(raw: number) {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(raw, WALL_RANKING_POLICY.maxAffinityBoost);
}
