export const FEED_TRUST_POLICY = {
  hideUnresolvedReportsThreshold: 5,
  hideUniqueReporterThreshold: 3,
  shadowbanUnresolvedReportsThreshold: 8,
  shadowbanUniqueReporterThreshold: 4,
  severeReasonShadowbanUniqueReporterThreshold: 2
} as const;

export const WALL_RANKING_POLICY = {
  candidateTake: 80,
  pageSize: 12,
  recencyHalfLifeHours: 18,
  recencyWeight: 6,
  maxAffinityBoost: 1.2,
  unresolvedReportPenalty: 1.2,
  freshnessDecaySchedule: [
    { maxAgeHours: 6, multiplier: 1.12 },
    { maxAgeHours: 24, multiplier: 1 },
    { maxAgeHours: 72, multiplier: 0.72 },
    { maxAgeHours: 168, multiplier: 0.42 },
    { maxAgeHours: Number.POSITIVE_INFINITY, multiplier: 0.22 }
  ],
  surgeWindowHours: 8,
  surgeVelocityThreshold: 3.2,
  surgeEngagementThreshold: 8,
  surgeBoost: 3.5,
  rapidPostWindowHours: 2,
  lowQualityMinEngagement: 4,
  lowQualityFreshnessCap: 1.4
} as const;

const SEVERE_REASON_PATTERNS = [
  /child/i,
  /csam/i,
  /sexual abuse/i,
  /violent/i,
  /terror/i,
  /threat/i,
  /self-harm/i
];

export function isSevereReportReason(reason: string) {
  return SEVERE_REASON_PATTERNS.some((pattern) => pattern.test(reason));
}
