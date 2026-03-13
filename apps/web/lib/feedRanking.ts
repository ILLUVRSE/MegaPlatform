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

export function scoreWallPost(input: WallScoreInput, options: FreshnessScoreOptions = {}) {
  const freshness = computeFreshnessScore(input, options);
  const engagement = computeWallEngagementScore(input);
  const editorial = (input.isPinned ? 4 : 0) + (input.isFeatured ? 2.5 + Math.max(0, 5 - input.featuredRank) * 0.4 : 0);
  const trustPenalty = input.unresolvedReports * WALL_RANKING_POLICY.unresolvedReportPenalty;

  return freshness.total + engagement + editorial + input.affinityBoost - trustPenalty;
}

export function clampAffinityBoost(raw: number) {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(raw, WALL_RANKING_POLICY.maxAffinityBoost);
}

type FreshnessScoreOptions = {
  now?: number;
  allowSurge?: boolean;
  maxFreshnessBoost?: number;
};

export function computeWallEngagementScore(input: Pick<WallScoreInput, "likeCount" | "commentCount" | "shareCount">) {
  return input.likeCount * 1.1 + input.commentCount * 1.7 + input.shareCount * 2.2;
}

export function deriveWallFreshnessSignals(
  input: Pick<WallScoreInput, "createdAt" | "likeCount" | "commentCount" | "shareCount">,
  options: Pick<FreshnessScoreOptions, "now"> = {}
) {
  const now = options.now ?? Date.now();
  const ageHours = Math.max(0, (now - input.createdAt.getTime()) / (1000 * 60 * 60));
  const engagementScore = computeWallEngagementScore(input);
  const decayMultiplier =
    WALL_RANKING_POLICY.freshnessDecaySchedule.find((entry) => ageHours <= entry.maxAgeHours)?.multiplier ?? 1;
  const baseRecency =
    Math.exp(-ageHours / WALL_RANKING_POLICY.recencyHalfLifeHours) *
    WALL_RANKING_POLICY.recencyWeight *
    decayMultiplier;
  const engagementVelocity = engagementScore / Math.max(1, ageHours);
  const qualifiesForSurge =
    ageHours <= WALL_RANKING_POLICY.surgeWindowHours &&
    engagementScore >= WALL_RANKING_POLICY.surgeEngagementThreshold &&
    engagementVelocity >= WALL_RANKING_POLICY.surgeVelocityThreshold;
  const lowQualityRapidPost =
    ageHours <= WALL_RANKING_POLICY.rapidPostWindowHours &&
    engagementScore < WALL_RANKING_POLICY.lowQualityMinEngagement;

  return {
    ageHours,
    engagementScore,
    engagementVelocity,
    decayMultiplier,
    baseRecency,
    qualifiesForSurge,
    lowQualityRapidPost
  };
}

export function computeFreshnessScore(input: WallScoreInput, options: FreshnessScoreOptions = {}) {
  const signals = deriveWallFreshnessSignals(input, options);
  const surge =
    options.allowSurge !== false && signals.qualifiesForSurge
      ? Math.min(1.75, signals.engagementVelocity / WALL_RANKING_POLICY.surgeVelocityThreshold) *
        WALL_RANKING_POLICY.surgeBoost
      : 0;
  const uncapped = signals.baseRecency + surge;
  const total =
    options.maxFreshnessBoost === undefined ? uncapped : Math.min(uncapped, Math.max(0, options.maxFreshnessBoost));

  return {
    ...signals,
    surge,
    total
  };
}
