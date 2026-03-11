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
  maxAffinityBoost: 1.2,
  unresolvedReportPenalty: 1.2
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
