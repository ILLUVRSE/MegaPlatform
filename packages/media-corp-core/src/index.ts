export const MEDIA_CORP_DIVISIONS = [
  "board",
  "research",
  "ip_foundry",
  "content_studio",
  "quality",
  "publishing",
  "franchise_development"
] as const;

export const MEDIA_FORMATS = [
  "image",
  "artwork",
  "meme",
  "wall_post",
  "video_short",
  "music_concept",
  "podcast_concept",
  "game_concept",
  "movie_concept"
] as const;

export const GREENLIGHT_DECISIONS = ["kill", "test", "incubate", "scale", "flagship"] as const;
export const WORKFLOW_STAGE_STATUSES = ["pending", "running", "completed", "failed", "blocked"] as const;
export const AGENT_RUN_STATUSES = ["queued", "running", "succeeded", "failed", "blocked"] as const;
export const ARTIFACT_TYPES = [
  "image_concept",
  "generated_image",
  "meme_variant",
  "wall_post_copy",
  "shorts_package",
  "podcast_package",
  "music_concept_pack",
  "game_concept_pack",
  "trailer_package",
  "distribution_package"
] as const;
export const ARTIFACT_STATUSES = ["draft", "generated", "in_review", "approved", "rejected", "release_candidate", "published"] as const;
export const GENERATION_JOB_TYPES = [
  "generate-image",
  "generate-meme-set",
  "generate-wall-post",
  "generate-shorts-package",
  "generate-podcast-package",
  "generate-music-concept",
  "generate-game-concept-pack",
  "generate-trailer-package"
] as const;
export const GENERATION_JOB_STATUSES = ["queued", "running", "completed", "failed", "cancelled", "retryable_failure"] as const;
export const REVIEW_DECISIONS = ["approve", "reject", "revise"] as const;
export const RELEASE_CANDIDATE_STATUSES = ["draft", "ready", "scheduled", "published"] as const;
export const DISTRIBUTION_CHANNEL_TYPES = [
  "wall_posts",
  "shorts_feed",
  "featured_cards",
  "home_feed_module",
  "newsletter_digest",
  "podcast_feed",
  "franchise_landing_page",
  "game_discovery_shelf",
  "sandbox_demo"
] as const;
export const PUBLISH_ATTEMPT_STATUSES = [
  "queued",
  "scheduled",
  "immediate",
  "dry_run",
  "sandbox",
  "failed",
  "cancelled",
  "published",
  "partially_published"
] as const;
export const PERFORMANCE_EVENT_TYPES = [
  "impression",
  "view",
  "open",
  "click",
  "watch_time",
  "completion",
  "like",
  "share",
  "save",
  "comment",
  "repost",
  "conversion_proxy",
  "retention"
] as const;
export const CAMPAIGN_TYPES = [
  "franchise_launch",
  "seasonal_drop",
  "character_introduction",
  "meme_burst",
  "shorts_burst",
  "podcast_promo_run",
  "trailer_push",
  "game_concept_test_wave"
] as const;
export const EXPERIMENT_STATUSES = ["draft", "running", "completed"] as const;
export const RECOMMENDATION_TYPES = [
  "increase_franchise_momentum",
  "decrease_franchise_momentum",
  "promote_tier",
  "suppress_format",
  "prioritize_channel",
  "recommend_sequel",
  "recommend_spinoff",
  "recommend_campaign",
  "recommend_rework"
] as const;
export const STRATEGIC_GOAL_TYPES = [
  "audience_growth",
  "engagement_growth",
  "franchise_incubation",
  "franchise_scaling",
  "creator_content_volume",
  "channel_expansion",
  "experiment_throughput",
  "cost_efficiency",
  "originality_improvement",
  "content_quality_improvement",
  "safe_publishing"
] as const;
export const GOAL_CONSTRAINT_MODES = ["hard", "soft"] as const;
export const BUDGET_SCOPES = [
  "generation_jobs",
  "campaign_volume",
  "channel_slots",
  "experiment_slots",
  "franchise_investment",
  "compute_tokens",
  "human_review_capacity",
  "publishing_cadence"
] as const;
export const BUDGET_INTERVALS = ["daily", "weekly", "monthly", "quarterly", "campaign"] as const;
export const RESOURCE_POOL_KINDS = ["budget", "capacity", "slot", "queue", "review_bandwidth", "token_quota"] as const;
export const EXECUTIVE_PLAN_STATUSES = ["draft", "active", "superseded", "completed", "cancelled"] as const;
export const EXECUTIVE_CYCLE_TYPES = [
  "daily_operating_review",
  "weekly_portfolio_review",
  "campaign_launch_cycle",
  "experiment_review_cycle",
  "monthly_franchise_investment_review",
  "budget_rebalance_cycle"
] as const;
export const DIRECTIVE_ACTION_TYPES = [
  "increase_format_output",
  "decrease_format_output",
  "launch_campaign",
  "pause_channel_mix",
  "request_sequel_assets",
  "queue_trend_brief",
  "seed_franchise",
  "produce_bundle",
  "change_review_priority",
  "schedule_publish_wave",
  "create_experiment",
  "trigger_rework",
  "archive_concept",
  "promote_franchise",
  "pause_franchise",
  "sunset_franchise",
  "rebalance_budget"
] as const;
export const PLAN_ASSIGNMENT_STATUSES = ["planned", "queued", "awaiting_approval", "running", "completed", "blocked", "cancelled"] as const;
export const AUTONOMY_MODES = [
  "manual_only",
  "advisory",
  "semi_autonomous",
  "fully_autonomous_sandbox",
  "fully_autonomous_constrained"
] as const;
export const POLICY_SEVERITIES = ["info", "warning", "block"] as const;
export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "expired"] as const;
export const OVERRIDE_STATUSES = ["active", "expired", "cancelled"] as const;
export const FORECAST_METRICS = [
  "content_output",
  "campaign_reach",
  "budget_burn",
  "engagement_uplift",
  "franchise_momentum",
  "review_queue_load"
] as const;

export type MediaCorpDivision = (typeof MEDIA_CORP_DIVISIONS)[number];
export type MediaFormat = (typeof MEDIA_FORMATS)[number];
export type GreenlightDecision = (typeof GREENLIGHT_DECISIONS)[number];
export type WorkflowStageStatus = (typeof WORKFLOW_STAGE_STATUSES)[number];
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];
export type GenerationJobType = (typeof GENERATION_JOB_TYPES)[number];
export type GenerationJobStatus = (typeof GENERATION_JOB_STATUSES)[number];
export type ReviewDecisionType = (typeof REVIEW_DECISIONS)[number];
export type ReleaseCandidateStatus = (typeof RELEASE_CANDIDATE_STATUSES)[number];
export type DistributionChannelType = (typeof DISTRIBUTION_CHANNEL_TYPES)[number];
export type PublishAttemptStatus = (typeof PUBLISH_ATTEMPT_STATUSES)[number];
export type PerformanceEventType = (typeof PERFORMANCE_EVENT_TYPES)[number];
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];
export type StrategicGoalType = (typeof STRATEGIC_GOAL_TYPES)[number];
export type GoalConstraintMode = (typeof GOAL_CONSTRAINT_MODES)[number];
export type BudgetScope = (typeof BUDGET_SCOPES)[number];
export type BudgetInterval = (typeof BUDGET_INTERVALS)[number];
export type ResourcePoolKind = (typeof RESOURCE_POOL_KINDS)[number];
export type ExecutivePlanStatus = (typeof EXECUTIVE_PLAN_STATUSES)[number];
export type ExecutiveCycleType = (typeof EXECUTIVE_CYCLE_TYPES)[number];
export type DirectiveActionType = (typeof DIRECTIVE_ACTION_TYPES)[number];
export type PlanAssignmentStatus = (typeof PLAN_ASSIGNMENT_STATUSES)[number];
export type AutonomyModeType = (typeof AUTONOMY_MODES)[number];
export type PolicySeverity = (typeof POLICY_SEVERITIES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type OverrideStatus = (typeof OVERRIDE_STATUSES)[number];
export type ForecastMetric = (typeof FORECAST_METRICS)[number];

export type AgentRoleId =
  | "ceo_agent"
  | "chief_creative_officer_agent"
  | "chief_growth_officer_agent"
  | "chief_intelligence_officer_agent"
  | "chief_operations_officer_agent"
  | "budget_allocator_agent"
  | "governance_officer_agent"
  | "trend_scout_agent"
  | "aesthetic_scanner_agent"
  | "culture_signal_agent"
  | "format_opportunity_agent"
  | "universe_architect_agent"
  | "character_foundry_agent"
  | "lore_engine_agent"
  | "naming_engine_agent"
  | "art_direction_engine"
  | "canon_archivist_agent"
  | "image_studio_agent"
  | "meme_studio_agent"
  | "wall_post_agent"
  | "shorts_script_agent"
  | "storyboard_agent"
  | "music_concept_agent"
  | "podcast_concept_agent"
  | "game_concept_agent"
  | "trailer_movie_concept_agent"
  | "quality_gate_agent"
  | "style_consistency_agent"
  | "continuity_checker_agent"
  | "similarity_rights_risk_screener"
  | "duplication_detector_agent"
  | "brand_safety_agent"
  | "publishing_scheduler_agent"
  | "packaging_agent"
  | "headline_caption_agent"
  | "thumbnail_cover_planner"
  | "channel_routing_agent"
  | "performance_analyst_agent"
  | "franchise_manager_agent"
  | "sequel_expansion_planner"
  | "portfolio_rebalancer_agent";

export type AudienceTarget = {
  primary: string;
  secondary: string[];
  emotions: string[];
  channels: string[];
};

export type GoalWindow = {
  startAt: string;
  endAt: string;
  cadence: "daily" | "weekly" | "monthly" | "quarterly" | "custom";
};

export type GoalTarget = {
  metric: string;
  targetValue?: number;
  minValue?: number;
  maxValue?: number;
  currentValue?: number;
  unit: string;
};

export type GoalProgress = {
  currentValue: number;
  targetValue?: number;
  attainmentPct: number;
  trend: "up" | "flat" | "down";
  status: "off_track" | "at_risk" | "on_track" | "ahead";
  measuredAt: string;
};

export type GoalConflict = {
  id: string;
  goalId: string;
  conflictingGoalId: string;
  conflictType: "budget" | "capacity" | "priority" | "policy" | "cadence";
  severity: number;
  explanation: string;
  resolutionStrategy: string;
  createdAt: string;
};

export type GoalEvaluation = {
  id: string;
  goalId: string;
  score: number;
  status: GoalProgress["status"];
  blockers: string[];
  opportunities: string[];
  rationale: string[];
  measuredAt: string;
};

export type GoalPriorityProfile = {
  id: string;
  goalId: string;
  weight: number;
  urgency: number;
  expectedLeverage: number;
  hardConstraintBias: number;
  notes: string[];
  updatedAt: string;
};

export type StrategicGoal = {
  id: string;
  type: StrategicGoalType;
  title: string;
  description: string;
  targets: GoalTarget[];
  window: GoalWindow;
  priorityWeight: number;
  applicableFranchiseIds: string[];
  applicableChannelIds: string[];
  applicableFormats: MediaFormat[];
  constraintMode: GoalConstraintMode;
  progress: GoalProgress;
  explanationMetadata: Record<string, unknown>;
  priorityProfileId?: string;
  conflictIds: string[];
  evaluationIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type BudgetGuardrail = {
  id: string;
  budgetId: string;
  name: string;
  metric: string;
  maxValue?: number;
  minValue?: number;
  severity: PolicySeverity;
  enforcementAction: "warn" | "block" | "escalate";
  rationale: string;
  createdAt: string;
};

export type Budget = {
  id: string;
  name: string;
  scope: BudgetScope;
  interval: BudgetInterval;
  allocatedAmount: number;
  consumedAmount: number;
  reservedAmount: number;
  remainingAmount: number;
  currencyOrUnit: string;
  applicableFranchiseIds: string[];
  applicableChannelIds: string[];
  applicableFormats: MediaFormat[];
  guardrailIds: string[];
  rationale: string[];
  createdAt: string;
  updatedAt: string;
};

export type BudgetAllocation = {
  id: string;
  budgetId: string;
  targetType: "franchise" | "campaign" | "channel" | "format" | "workflow";
  targetId: string;
  amount: number;
  reservedAmount: number;
  consumedAmount: number;
  rationale: string[];
  createdAt: string;
  updatedAt: string;
};

export type ResourcePool = {
  id: string;
  name: string;
  kind: ResourcePoolKind;
  totalCapacity: number;
  reservedCapacity: number;
  consumedCapacity: number;
  remainingCapacity: number;
  unit: string;
  applicableFranchiseIds: string[];
  applicableChannelIds: string[];
  applicableFormats: MediaFormat[];
  createdAt: string;
  updatedAt: string;
};

export type CapacityWindow = {
  id: string;
  resourcePoolId: string;
  label: string;
  startAt: string;
  endAt: string;
  totalCapacity: number;
  reservedCapacity: number;
  consumedCapacity: number;
  createdAt: string;
};

export type SpendEvent = {
  id: string;
  budgetId: string;
  allocationId?: string;
  resourcePoolId?: string;
  amount: number;
  eventType: "allocate" | "reserve" | "consume" | "release" | "overrun_attempt";
  rationale: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
};

export type AllocationDecision = {
  id: string;
  budgetId?: string;
  resourcePoolId?: string;
  targetType: BudgetAllocation["targetType"];
  targetId: string;
  decision: "approve" | "throttle" | "deny" | "rebalance";
  rationale: string[];
  alternativesRejected: string[];
  confidence: number;
  createdAt: string;
};

export type PlanObjective = {
  id: string;
  planId: string;
  goalId?: string;
  title: string;
  summary: string;
  priority: number;
  targetMetric: string;
  targetValue?: number;
  createdAt: string;
};

export type PlanDirective = {
  id: string;
  planId: string;
  objectiveId?: string;
  actionType: DirectiveActionType;
  targetType: "franchise" | "campaign" | "channel" | "format" | "bundle" | "workflow";
  targetId: string;
  status: "draft" | "active" | "queued" | "blocked" | "completed" | "cancelled";
  summary: string;
  rationale: string[];
  downstreamTaskIds: string[];
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanAssignment = {
  id: string;
  directiveId: string;
  agentId: AgentRoleId;
  workflowId: string;
  stageId: string;
  status: PlanAssignmentStatus;
  notes: string[];
  downstreamTaskId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanDecision = {
  id: string;
  planId: string;
  directiveId?: string;
  decisionType: "prioritize" | "pause" | "scale" | "rebalance" | "approve" | "escalate";
  summary: string;
  rationale: string[];
  confidence: number;
  createdAt: string;
};

export type PlanOutcomeExpectation = {
  id: string;
  planId: string;
  directiveId?: string;
  metric: ForecastMetric | string;
  baselineValue: number;
  expectedValue: number;
  confidence: number;
  timeframe: GoalWindow;
  upsideNotes: string[];
  downsideNotes: string[];
  createdAt: string;
};

export type ExecutivePlan = {
  id: string;
  cycleId: string;
  title: string;
  summary: string;
  version: number;
  status: ExecutivePlanStatus;
  autonomyMode: AutonomyModeType;
  inputSnapshotIds: string[];
  objectiveIds: string[];
  directiveIds: string[];
  decisionIds: string[];
  outcomeExpectationIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PlanningCycle = {
  id: string;
  cycleType: ExecutiveCycleType;
  label: string;
  startedAt: string;
  endedAt?: string;
  status: "draft" | "running" | "completed" | "failed";
  autonomyMode: AutonomyModeType;
  executivePlanId?: string;
  summary: string;
  createdAt: string;
};

export type ApprovalRule = {
  id: string;
  policyId: string;
  name: string;
  actionType: DirectiveActionType | "publish" | "launch_campaign" | "budget_increase" | "scale_up";
  appliesToTargetType?: PlanDirective["targetType"];
  thresholdMetric?: string;
  thresholdValue?: number;
  approverRole: "human_admin" | "governance_officer_agent" | "chief_operations_officer_agent" | "ceo_agent";
  status: ApprovalStatus;
  createdAt: string;
};

export type DecisionGuardrail = {
  id: string;
  policyId: string;
  name: string;
  scope: "planning" | "budget" | "publish" | "experiment" | "franchise";
  severity: PolicySeverity;
  condition: string;
  enforcementAction: "warn" | "block" | "escalate";
  createdAt: string;
};

export type EscalationRule = {
  id: string;
  policyId?: string;
  triggerType: "budget_overrun" | "approval_required" | "policy_violation" | "freeze_hit" | "confidence_low";
  threshold?: number;
  routeTo: Array<"human_admin" | "ceo_agent" | "chief_operations_officer_agent" | "governance_officer_agent">;
  summary: string;
  createdAt: string;
};

export type GovernancePolicy = {
  id: string;
  name: string;
  description: string;
  autonomyMode: AutonomyModeType;
  enabled: boolean;
  scope: Array<"planning" | "budget" | "review" | "publish" | "experiment" | "franchise">;
  approvalRuleIds: string[];
  decisionGuardrailIds: string[];
  escalationRuleIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PolicyViolation = {
  id: string;
  policyId: string;
  guardrailId?: string;
  decisionLogId?: string;
  directiveId?: string;
  severity: PolicySeverity;
  summary: string;
  blockedAction: string;
  resolutionStatus: "open" | "escalated" | "resolved" | "waived";
  createdAt: string;
  resolvedAt?: string;
};

export type ManualOverride = {
  id: string;
  targetType: "goal" | "budget" | "directive" | "assignment" | "franchise" | "campaign" | "policy";
  targetId: string;
  action: string;
  reason: string;
  status: OverrideStatus;
  actor: string;
  createdAt: string;
  expiresAt?: string;
};

export type FreezeWindow = {
  id: string;
  label: string;
  scope: Array<"global" | "franchise" | "campaign" | "channel" | "publish">;
  franchiseIds: string[];
  campaignIds: string[];
  channelIds: string[];
  startAt: string;
  endAt: string;
  reason: string;
  createdAt: string;
};

export type DecisionInputSnapshot = {
  id: string;
  cycleId?: string;
  sourceType: "goal_state" | "budget_state" | "performance_state" | "policy_state" | "portfolio_state";
  sourceId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type DecisionReason = {
  id: string;
  decisionLogId: string;
  kind: "goal" | "metric" | "policy" | "budget" | "forecast" | "operator_context";
  summary: string;
  weight: number;
  createdAt: string;
};

export type AlternativeConsidered = {
  id: string;
  decisionLogId: string;
  label: string;
  summary: string;
  rejectionReason: string;
  createdAt: string;
};

export type ConfidenceAssessment = {
  id: string;
  decisionLogId: string;
  score: number;
  drivers: string[];
  riskFactors: string[];
  createdAt: string;
};

export type ExpectedImpact = {
  id: string;
  decisionLogId: string;
  metric: ForecastMetric | string;
  baselineValue: number;
  expectedValue: number;
  upside: string[];
  downside: string[];
  createdAt: string;
};

export type PostHocEvaluation = {
  id: string;
  decisionLogId: string;
  outcome: "successful" | "mixed" | "failed" | "unknown";
  summary: string;
  actualMetrics: Record<string, number>;
  lessons: string[];
  evaluatedAt: string;
};

export type DecisionLog = {
  id: string;
  cycleId?: string;
  planId?: string;
  directiveId?: string;
  decisionType: "plan" | "allocation" | "approval" | "throttle" | "rebalance" | "suppression" | "promotion";
  summary: string;
  inputSnapshotIds: string[];
  reasonIds: string[];
  alternativeIds: string[];
  confidenceAssessmentId?: string;
  expectedImpactIds: string[];
  downstreamActionIds: string[];
  postHocEvaluationId?: string;
  createdAt: string;
};

export type ForecastRecord = {
  id: string;
  cycleId?: string;
  planId?: string;
  metric: ForecastMetric;
  targetType: "portfolio" | "franchise" | "campaign" | "channel" | "format" | "review_queue";
  targetId?: string;
  baselineValue: number;
  forecastValue: number;
  confidence: number;
  method: "deterministic" | "scoring_based";
  assumptions: string[];
  createdAt: string;
};

export type ExecutiveSummary = {
  id: string;
  cycleId: string;
  title: string;
  headline: string;
  highlights: string[];
  risks: string[];
  actions: string[];
  createdAt: string;
};

export type TrendBrief = {
  id: string;
  title: string;
  summary: string;
  signalSources: string[];
  themes: string[];
  aesthetics: string[];
  emotions: string[];
  formats: MediaFormat[];
  opportunityScore: number;
  audienceTarget: AudienceTarget;
  createdAt: string;
};

export type Character = {
  id: string;
  franchiseId: string;
  name: string;
  archetype: string;
  role: string;
  description: string;
  signatureTraits: string[];
  catchphrases: string[];
  visualMarkers: string[];
};

export type FranchiseSeed = {
  id: string;
  slug: string;
  name: string;
  premise: string;
  worldHook: string;
  tone: string;
  audienceTarget: AudienceTarget;
  motifs: string[];
  styleGuide: string[];
  legalNotes: string[];
  trendBriefId: string;
  createdAt: string;
};

export type Franchise = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  status: GreenlightDecision;
  tier: GreenlightDecision;
  premise: string;
  worldSummary: string;
  tone: string;
  audienceTarget: AudienceTarget;
  performanceHistory: PerformanceReport[];
  legalNotes: string[];
  createdAt: string;
  updatedAt: string;
};

export type CanonRecord = {
  id: string;
  franchiseId: string;
  version: number;
  worldRules: string[];
  continuityRules: string[];
  styleGuide: string[];
  loreSummary: string;
  visualLanguage: string[];
  characters: Character[];
  audienceTarget: AudienceTarget;
  legalNotes: string[];
  performanceHistory: PerformanceReport[];
  updatedAt: string;
};

export type ContentAssetPlan = {
  id: string;
  franchiseId: string;
  seedId: string;
  format: MediaFormat;
  title: string;
  concept: string;
  hook: string;
  productionPlan: string[];
  channelTargets: string[];
  canonicalAnchors: string[];
  status: "planned" | "approved" | "rejected" | "published";
};

export type PromptTemplate = {
  id: string;
  version: number;
  medium: MediaFormat;
  purpose: string;
  variables: string[];
  safetyNotes: string[];
  outputSchema: string[];
  template: string;
};

export type PromptRun = {
  id: string;
  templateId: string;
  templateVersion: number;
  franchiseId: string;
  artifactBundleId: string;
  generationJobId: string;
  variables: Record<string, string>;
  resolvedPrompt: string;
  provider: string;
  model: string;
  createdAt: string;
};

export type GenerationJob = {
  id: string;
  franchiseId: string;
  seedId: string;
  contentPlanId: string;
  artifactBundleId: string;
  jobType: GenerationJobType;
  status: GenerationJobStatus;
  provider: string;
  model: string;
  promptTemplateId: string;
  canonContext: string[];
  inputBrief: string;
  outputsProduced: string[];
  runtimeMetadata: Record<string, unknown>;
  tokenUsage?: number;
  estimatedCostUsd?: number;
  createdAt: string;
  updatedAt: string;
};

export type Artifact = {
  id: string;
  franchiseId: string;
  seedId: string;
  contentPlanId: string;
  artifactBundleId: string;
  artifactType: ArtifactType;
  title: string;
  brief: string;
  sourcePrompt: string;
  generationParameters: Record<string, unknown>;
  storageLocation: string;
  previewUrl: string;
  metadata: Record<string, unknown>;
  status: ArtifactStatus;
  reviewStatus: "pending" | "approved" | "rejected" | "revise";
  qualityScore: number;
  rightsSimilarityRisk: number;
  lineage: string[];
  createdAt: string;
  updatedAt: string;
};

export type ArtifactVersion = {
  id: string;
  artifactId: string;
  version: number;
  sourcePrompt: string;
  generationParameters: Record<string, unknown>;
  storageLocation: string;
  previewUrl: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ArtifactBundle = {
  id: string;
  franchiseId: string;
  seedId: string;
  contentPlanId: string;
  title: string;
  medium: MediaFormat;
  brief: string;
  artifactIds: string[];
  generationJobIds: string[];
  promptRunIds: string[];
  reviewDecisionId?: string;
  releaseCandidateId?: string;
  lineage: string[];
  status: ArtifactStatus;
  reviewStatus: "pending" | "approved" | "rejected" | "revise";
  qualityScore: number;
  riskFlags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ArtifactReviewScorecard = {
  id: string;
  franchiseId: string;
  artifactBundleId: string;
  canonConsistency: number;
  originality: number;
  brandFit: number;
  packageCompleteness: number;
  duplicationRisk: number;
  similarityRisk: number;
  publishReadiness: number;
  overall: number;
  flags: string[];
  rationale: string[];
  createdAt: string;
};

export type ReviewDecision = {
  id: string;
  franchiseId: string;
  artifactBundleId: string;
  decision: ReviewDecisionType;
  reviewer: string;
  notes: string;
  requiredChanges: string[];
  scorecardId: string;
  createdAt: string;
};

export type DistributionPackage = {
  id: string;
  releaseCandidateId: string;
  channel: string;
  packageTitle: string;
  body: string;
  assetsAttached: string[];
  publishTimingRecommendation: string;
  audienceTarget: AudienceTarget;
  cta: string;
  experimentTags: string[];
  createdAt: string;
};

export type ReleaseCandidate = {
  id: string;
  franchiseId: string;
  artifactBundleId: string;
  channel: string;
  packageTitle: string;
  body: string;
  assetIds: string[];
  publishTimingRecommendation: string;
  audienceTarget: AudienceTarget;
  cta: string;
  experimentTags: string[];
  status: ReleaseCandidateStatus;
  distributionPackageId: string;
  createdAt: string;
};

export type ChannelCapability = {
  supportsArtifactTypes: ArtifactType[];
  supportsReleaseStatuses: ReleaseCandidateStatus[];
  schedulingModes: Array<"scheduled" | "immediate" | "sandbox" | "dry_run">;
  experimentation: boolean;
  audienceControls: boolean;
};

export type DistributionChannel = {
  id: string;
  slug: string;
  name: string;
  type: DistributionChannelType;
  description: string;
  capabilities: ChannelCapability;
  requiredPackageFields: string[];
  schedulingConstraints: string[];
  status: "active" | "paused" | "sandbox_only";
  createdAt: string;
  updatedAt: string;
};

export type PublishTarget = {
  id: string;
  channelId: string;
  surface: string;
  sandbox: boolean;
  audienceSegmentIds: string[];
  requiredFields: string[];
};

export type PublishWindow = {
  id: string;
  channelId: string;
  label: string;
  startAt: string;
  endAt: string;
  timezone: string;
  priority: number;
};

export type PublishFailure = {
  code: string;
  message: string;
  retryable: boolean;
};

export type PublishResult = {
  id: string;
  publishAttemptId: string;
  placementId: string;
  externalId?: string;
  permalink?: string;
  slug?: string;
  publishedAt?: string;
  status: PublishAttemptStatus;
  previewPayload: Record<string, unknown>;
};

export type PublishAttempt = {
  id: string;
  releaseCandidateId: string;
  distributionPackageId: string;
  channelId: string;
  publishTargetId: string;
  publishWindowId?: string;
  status: PublishAttemptStatus;
  mode: "scheduled" | "immediate" | "dry_run" | "sandbox";
  scheduledFor?: string;
  executedAt?: string;
  resultId?: string;
  failure?: PublishFailure;
  adapterKey: string;
  createdAt: string;
  updatedAt: string;
};

export type AudienceSegment = {
  id: string;
  name: string;
  description: string;
  interests: string[];
  channels: string[];
  createdAt: string;
};

export type CampaignItem = {
  id: string;
  campaignId: string;
  releaseCandidateId: string;
  channelId: string;
  publishAttemptId?: string;
  objective: string;
  status: "planned" | "published" | "failed";
};

export type Campaign = {
  id: string;
  type: CampaignType;
  franchiseId: string;
  title: string;
  objective: string;
  targetAudienceSegmentIds: string[];
  targetChannelIds: string[];
  budgetPriority: number;
  scheduleStart: string;
  scheduleEnd: string;
  contentMix: string[];
  successCriteria: string[];
  campaignItemIds: string[];
  resultSummary: string;
  createdAt: string;
};

export type ExperimentAssignment = {
  id: string;
  experimentId: string;
  releaseCandidateId: string;
  channelId: string;
  variantKey: string;
  hypothesis: string;
  packageOverrides: Record<string, unknown>;
  status: ExperimentStatus;
  outcomeNotes?: string;
};

export type PerformanceEvent = {
  id: string;
  publishAttemptId: string;
  releaseCandidateId: string;
  franchiseId: string;
  channelId: string;
  artifactBundleId: string;
  promptTemplateId?: string;
  promptRunId?: string;
  agentId?: AgentRoleId;
  campaignId?: string;
  experimentId?: string;
  audienceSegmentId?: string;
  type: PerformanceEventType;
  value: number;
  occurredAt: string;
};

export type PerformanceSnapshot = {
  id: string;
  publishAttemptId: string;
  releaseCandidateId: string;
  franchiseId: string;
  channelId: string;
  metrics: {
    impressions: number;
    views: number;
    opens: number;
    clicks: number;
    watchTime: number;
    completionRate: number;
    likes: number;
    shares: number;
    saves: number;
    comments: number;
    reposts: number;
    ctr: number;
    engagementRate: number;
    conversionProxy: number;
    decayRate: number;
    audienceRetention: number;
    timeToFirstEngagementMin: number;
  };
  createdAt: string;
};

export type ContentMetricsRollup = {
  id: string;
  artifactBundleId: string;
  releaseCandidateId: string;
  metrics: PerformanceSnapshot["metrics"];
  createdAt: string;
};

export type ChannelMetricsRollup = {
  id: string;
  channelId: string;
  metrics: PerformanceSnapshot["metrics"];
  efficiencyScore: number;
  createdAt: string;
};

export type FranchiseMetricsRollup = {
  id: string;
  franchiseId: string;
  metrics: PerformanceSnapshot["metrics"];
  momentumScore: number;
  createdAt: string;
};

export type PromptPerformanceRollup = {
  id: string;
  promptTemplateId: string;
  promptRunId?: string;
  metrics: PerformanceSnapshot["metrics"];
  winRate: number;
  createdAt: string;
};

export type AgentPerformanceRollup = {
  id: string;
  agentId: AgentRoleId;
  metrics: PerformanceSnapshot["metrics"];
  efficiencyScore: number;
  createdAt: string;
};

export type StrategyRecommendation = {
  id: string;
  recommendationType: RecommendationType;
  franchiseId?: string;
  channelId?: string;
  format?: MediaFormat;
  promptTemplateId?: string;
  rationale: string[];
  confidence: number;
  action: string;
  createdAt: string;
};

export type QualityScorecard = {
  id: string;
  franchiseId: string;
  seedId: string;
  contentPlanIds: string[];
  uniqueness: number;
  visualStickiness: number;
  memePotential: number;
  serializationPotential: number;
  gamePotential: number;
  soundtrackPotential: number;
  audienceFit: number;
  legalSimilarityRisk: number;
  costEffort: number;
  franchiseExpandability: number;
  brandFit: number;
  continuityHealth: number;
  overall: number;
  decision: GreenlightDecision;
  rationale: string[];
  generatedAt: string;
};

export type PublishPlan = {
  id: string;
  franchiseId: string;
  contentPlanId: string;
  headline: string;
  caption: string;
  thumbnailPrompt: string;
  channels: string[];
  scheduledFor: string;
  packagingNotes: string[];
  status: "draft" | "scheduled" | "published";
};

export type PerformanceReport = {
  id: string;
  franchiseId: string;
  contentPlanId?: string;
  reach: number;
  engagementRate: number;
  saveRate: number;
  watchIntent: number;
  franchiseLift: number;
  retentionSignal: number;
  merchSignal: number;
  summary: string;
  createdAt: string;
};

export type AgentTask = {
  id: string;
  agentId: AgentRoleId;
  division: MediaCorpDivision;
  workflowId: string;
  stageId: string;
  status: WorkflowStageStatus;
  priority: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AgentRun = {
  id: string;
  agentId: AgentRoleId;
  taskId: string;
  workflowId: string;
  status: AgentRunStatus;
  summary: string;
  payload: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
};

export type WorkflowStage = {
  id: string;
  name: string;
  description: string;
  order: number;
  requiredAgents: AgentRoleId[];
  outputs: string[];
};

export type MediaCorpWorldState = {
  generatedAt: string;
  trendBriefs: TrendBrief[];
  seeds: FranchiseSeed[];
  franchises: Franchise[];
  canonRecords: CanonRecord[];
  contentPlans: ContentAssetPlan[];
  distributionChannels: DistributionChannel[];
  publishTargets: PublishTarget[];
  publishWindows: PublishWindow[];
  publishAttempts: PublishAttempt[];
  publishResults: PublishResult[];
  audienceSegments: AudienceSegment[];
  campaigns: Campaign[];
  campaignItems: CampaignItem[];
  experimentAssignments: ExperimentAssignment[];
  performanceEvents: PerformanceEvent[];
  performanceSnapshots: PerformanceSnapshot[];
  contentMetricsRollups: ContentMetricsRollup[];
  channelMetricsRollups: ChannelMetricsRollup[];
  franchiseMetricsRollups: FranchiseMetricsRollup[];
  promptPerformanceRollups: PromptPerformanceRollup[];
  agentPerformanceRollups: AgentPerformanceRollup[];
  strategyRecommendations: StrategyRecommendation[];
  promptTemplates: PromptTemplate[];
  promptRuns: PromptRun[];
  generationJobs: GenerationJob[];
  artifacts: Artifact[];
  artifactVersions: ArtifactVersion[];
  artifactBundles: ArtifactBundle[];
  artifactReviewScorecards: ArtifactReviewScorecard[];
  reviewDecisions: ReviewDecision[];
  releaseCandidates: ReleaseCandidate[];
  distributionPackages: DistributionPackage[];
  scorecards: QualityScorecard[];
  publishPlans: PublishPlan[];
  performanceReports: PerformanceReport[];
  agentTasks: AgentTask[];
  agentRuns: AgentRun[];
  strategicGoals: StrategicGoal[];
  goalConflicts: GoalConflict[];
  goalEvaluations: GoalEvaluation[];
  goalPriorityProfiles: GoalPriorityProfile[];
  budgets: Budget[];
  budgetAllocations: BudgetAllocation[];
  resourcePools: ResourcePool[];
  capacityWindows: CapacityWindow[];
  spendEvents: SpendEvent[];
  allocationDecisions: AllocationDecision[];
  budgetGuardrails: BudgetGuardrail[];
  planningCycles: PlanningCycle[];
  executivePlans: ExecutivePlan[];
  planObjectives: PlanObjective[];
  planDirectives: PlanDirective[];
  planAssignments: PlanAssignment[];
  planDecisions: PlanDecision[];
  planOutcomeExpectations: PlanOutcomeExpectation[];
  governancePolicies: GovernancePolicy[];
  approvalRules: ApprovalRule[];
  decisionGuardrails: DecisionGuardrail[];
  escalationRules: EscalationRule[];
  policyViolations: PolicyViolation[];
  manualOverrides: ManualOverride[];
  freezeWindows: FreezeWindow[];
  decisionLogs: DecisionLog[];
  decisionInputSnapshots: DecisionInputSnapshot[];
  decisionReasons: DecisionReason[];
  alternativesConsidered: AlternativeConsidered[];
  confidenceAssessments: ConfidenceAssessment[];
  expectedImpacts: ExpectedImpact[];
  postHocEvaluations: PostHocEvaluation[];
  forecasts: ForecastRecord[];
  executiveSummaries: ExecutiveSummary[];
  autonomyMode: AutonomyModeType;
  portfolioSummary: {
    kill: number;
    test: number;
    incubate: number;
    scale: number;
    flagship: number;
  };
};

export type AgentDefinition = {
  id: AgentRoleId;
  name: string;
  division: MediaCorpDivision;
  mission: string;
};

export type MediaCorpCycleResult = {
  worldState: MediaCorpWorldState;
  summary: {
    trendBriefsCreated: number;
    seedsCreated: number;
    franchisesUpdated: number;
    contentPlansCreated: number;
    publishPlansCreated: number;
    artifactBundlesCreated: number;
    releaseCandidatesCreated: number;
    publishAttemptsCreated: number;
    recommendationsCreated: number;
    planningCyclesCreated?: number;
    executivePlansCreated?: number;
    decisionLogsCreated?: number;
  };
};

export function createId(prefix: string, seed?: string) {
  const suffix = (seed ?? Math.random().toString(36).slice(2, 10)).replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `${prefix}_${suffix}`;
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export const PROMPT_TEMPLATE_REGISTRY: PromptTemplate[] = [
  {
    id: "image_poster_master",
    version: 1,
    medium: "image",
    purpose: "Generate key art and poster-ready image prompts.",
    variables: ["franchise", "tone", "styleGuide", "worldHook", "characterLead"],
    safetyNotes: ["Avoid direct franchise resemblance.", "Keep iconography original."],
    outputSchema: ["heroPrompt", "negativePrompt", "shotVariants", "metadataTags"],
    template:
      "Create a cinematic poster prompt for {{franchise}} with tone {{tone}}, style cues {{styleGuide}}, world hook {{worldHook}}, and protagonist {{characterLead}}."
  },
  {
    id: "meme_variant_pack",
    version: 1,
    medium: "meme",
    purpose: "Generate meme caption and remix packs.",
    variables: ["franchise", "motifs", "hook", "audience"],
    safetyNotes: ["Keep humor original.", "Avoid trademarked meme templates."],
    outputSchema: ["captions", "visualSetup", "remixHooks"],
    template:
      "Generate meme variants for {{franchise}} using motifs {{motifs}} and hook {{hook}} for audience {{audience}}."
  },
  {
    id: "shorts_package_builder",
    version: 1,
    medium: "video_short",
    purpose: "Build a short-form package with script, shots, thumbnail, and caption pack.",
    variables: ["franchise", "premise", "tone", "canonAnchor", "catchphrase"],
    safetyNotes: ["Keep canon anchors explicit.", "Avoid unsafe stunts or deceptive claims."],
    outputSchema: ["hook", "script", "beatSheet", "shotList", "captionPack", "thumbnailTitles"],
    template:
      "Create a 30-second short package for {{franchise}} grounded in {{premise}}, tone {{tone}}, canon anchor {{canonAnchor}}, and catchphrase {{catchphrase}}."
  },
  {
    id: "podcast_pilot_builder",
    version: 1,
    medium: "podcast_concept",
    purpose: "Generate podcast episode concept packages.",
    variables: ["franchise", "worldHook", "loreSummary", "audience"],
    safetyNotes: ["Keep lore internally consistent.", "No real-world defamation or impersonation."],
    outputSchema: ["episodeTitle", "outline", "segments", "teaserCopy", "clipCandidates"],
    template:
      "Build a lore podcast pilot for {{franchise}} using world hook {{worldHook}}, lore {{loreSummary}}, for audience {{audience}}."
  },
  {
    id: "game_concept_pack_builder",
    version: 1,
    medium: "game_concept",
    purpose: "Generate microgame concept packs.",
    variables: ["franchise", "motifs", "worldRules", "audience"],
    safetyNotes: ["Keep mechanics original.", "No direct cloning of existing branded games."],
    outputSchema: ["coreLoop", "mechanics", "progression", "artDirection", "prototypeBrief"],
    template:
      "Create a microgame concept pack for {{franchise}} using motifs {{motifs}}, world rules {{worldRules}}, and audience {{audience}}."
  },
  {
    id: "trailer_package_builder",
    version: 1,
    medium: "movie_concept",
    purpose: "Generate cinematic trailer and feature concept packages.",
    variables: ["franchise", "premise", "tone", "styleGuide", "worldHook"],
    safetyNotes: ["Preserve original worldbuilding.", "Avoid derivative blockbuster beat patterns."],
    outputSchema: ["logline", "storyBeats", "trailerStructure", "posterPrompts", "soundtrackDirection"],
    template:
      "Create a trailer-first cinematic package for {{franchise}} with premise {{premise}}, tone {{tone}}, style {{styleGuide}}, and world hook {{worldHook}}."
  }
];

export const DEFAULT_DISTRIBUTION_CHANNELS: DistributionChannel[] = [
  {
    id: "channel_wall_posts",
    slug: "wall-posts",
    name: "Internal Wall Posts",
    type: "wall_posts",
    description: "In-platform social wall for franchise voice and community testing.",
    capabilities: {
      supportsArtifactTypes: ["wall_post_copy", "meme_variant", "generated_image"],
      supportsReleaseStatuses: ["ready", "scheduled", "published"],
      schedulingModes: ["scheduled", "immediate", "sandbox", "dry_run"],
      experimentation: true,
      audienceControls: true
    },
    requiredPackageFields: ["packageTitle", "body", "assetsAttached"],
    schedulingConstraints: ["Avoid more than 3 posts per franchise per day."],
    status: "active",
    createdAt: "2026-03-07T13:00:00.000Z",
    updatedAt: "2026-03-07T13:00:00.000Z"
  },
  {
    id: "channel_shorts_feed",
    slug: "shorts-feed",
    name: "Shorts Feed",
    type: "shorts_feed",
    description: "Short-form discovery feed for trailer and shorts packages.",
    capabilities: {
      supportsArtifactTypes: ["shorts_package", "trailer_package"],
      supportsReleaseStatuses: ["ready", "scheduled", "published"],
      schedulingModes: ["scheduled", "immediate", "sandbox", "dry_run"],
      experimentation: true,
      audienceControls: true
    },
    requiredPackageFields: ["packageTitle", "body", "assetsAttached", "cta"],
    schedulingConstraints: ["Keep title under 60 characters.", "Prefer evening windows for demo data."],
    status: "active",
    createdAt: "2026-03-07T13:00:00.000Z",
    updatedAt: "2026-03-07T13:00:00.000Z"
  },
  {
    id: "channel_home_feed",
    slug: "home-feed-modules",
    name: "Home Feed Modules",
    type: "home_feed_module",
    description: "Promoted in-app module placements for packaged franchise drops.",
    capabilities: {
      supportsArtifactTypes: ["generated_image", "meme_variant", "shorts_package", "game_concept_pack", "trailer_package"],
      supportsReleaseStatuses: ["ready", "scheduled", "published"],
      schedulingModes: ["scheduled", "sandbox", "dry_run"],
      experimentation: true,
      audienceControls: true
    },
    requiredPackageFields: ["packageTitle", "body", "assetsAttached", "experimentTags"],
    schedulingConstraints: ["One module per franchise per window."],
    status: "active",
    createdAt: "2026-03-07T13:00:00.000Z",
    updatedAt: "2026-03-07T13:00:00.000Z"
  },
  {
    id: "channel_sandbox",
    slug: "sandbox-demo",
    name: "Sandbox Demo",
    type: "sandbox_demo",
    description: "Safe internal target for preview publishing and synthetic metrics.",
    capabilities: {
      supportsArtifactTypes: ["generated_image", "meme_variant", "wall_post_copy", "shorts_package", "podcast_package", "music_concept_pack", "game_concept_pack", "trailer_package"],
      supportsReleaseStatuses: ["ready", "scheduled", "published", "draft"],
      schedulingModes: ["sandbox", "dry_run", "immediate", "scheduled"],
      experimentation: true,
      audienceControls: true
    },
    requiredPackageFields: ["packageTitle", "body"],
    schedulingConstraints: ["No external side effects."],
    status: "sandbox_only",
    createdAt: "2026-03-07T13:00:00.000Z",
    updatedAt: "2026-03-07T13:00:00.000Z"
  }
];

export const DEFAULT_AUDIENCE_SEGMENTS: AudienceSegment[] = [
  {
    id: "aud_genz_scifi",
    name: "Gen Z Sci-Fi",
    description: "High-meme, high-lore audience for speculative worlds.",
    interests: ["sci-fi", "franchise lore", "short-form video"],
    channels: ["wall-posts", "shorts-feed", "sandbox-demo"],
    createdAt: "2026-03-07T13:00:00.000Z"
  },
  {
    id: "aud_cozy_fantasy",
    name: "Cozy Fantasy",
    description: "Comfort-driven audience for worldbuilding, audio, and art drops.",
    interests: ["cozy fantasy", "soundtracks", "podcasts"],
    channels: ["home-feed-modules", "sandbox-demo"],
    createdAt: "2026-03-07T13:00:00.000Z"
  }
];

export const MEDIA_CORP_AGENT_ROSTER: AgentDefinition[] = [
  { id: "ceo_agent", name: "CEO Agent", division: "board", mission: "Allocate budget and portfolio attention." },
  { id: "chief_creative_officer_agent", name: "Chief Creative Officer Agent", division: "board", mission: "Protect originality and franchise coherence." },
  { id: "chief_growth_officer_agent", name: "Chief Growth Officer Agent", division: "board", mission: "Optimize for distribution fit and repeatable audience pull." },
  { id: "chief_intelligence_officer_agent", name: "Chief Intelligence Officer Agent", division: "board", mission: "Translate signals into opportunity maps." },
  { id: "chief_operations_officer_agent", name: "Chief Operations Officer Agent", division: "board", mission: "Keep throughput, queues, and budgets healthy." },
  { id: "trend_scout_agent", name: "Trend Scout Agent", division: "research", mission: "Identify emerging themes and audience openings." },
  { id: "aesthetic_scanner_agent", name: "Aesthetic Scanner Agent", division: "research", mission: "Map visual and tonal opportunities." },
  { id: "culture_signal_agent", name: "Culture Signal Agent", division: "research", mission: "Frame emotional and social hooks." },
  { id: "format_opportunity_agent", name: "Format Opportunity Agent", division: "research", mission: "Route concepts into low-cost validation formats." },
  { id: "universe_architect_agent", name: "Universe Architect Agent", division: "ip_foundry", mission: "Invent world premises and franchise seeds." },
  { id: "character_foundry_agent", name: "Character Foundry Agent", division: "ip_foundry", mission: "Generate durable lead characters." },
  { id: "lore_engine_agent", name: "Lore Engine Agent", division: "ip_foundry", mission: "Establish lore engines for serialization." },
  { id: "naming_engine_agent", name: "Naming Engine Agent", division: "ip_foundry", mission: "Produce names, motifs, and slogans." },
  { id: "art_direction_engine", name: "Art Direction Engine", division: "ip_foundry", mission: "Set visual language and signature shapes." },
  { id: "canon_archivist_agent", name: "Canon Archivist Agent", division: "ip_foundry", mission: "Persist canon as the system of record." },
  { id: "image_studio_agent", name: "Image Studio Agent", division: "content_studio", mission: "Plan key art and posters." },
  { id: "meme_studio_agent", name: "Meme Studio Agent", division: "content_studio", mission: "Translate concepts into memetic tests." },
  { id: "wall_post_agent", name: "Wall Post Agent", division: "content_studio", mission: "Create social voice and in-world posts." },
  { id: "shorts_script_agent", name: "Shorts Script Agent", division: "content_studio", mission: "Outline short-form hooks and scenes." },
  { id: "storyboard_agent", name: "Storyboard Agent", division: "content_studio", mission: "Turn hooks into shot structures." },
  { id: "music_concept_agent", name: "Music Concept Agent", division: "content_studio", mission: "Plan soundtrack identities and motifs." },
  { id: "podcast_concept_agent", name: "Podcast Concept Agent", division: "content_studio", mission: "Spin concepts into recurring discussion formats." },
  { id: "game_concept_agent", name: "Game Concept Agent", division: "content_studio", mission: "Create microgame loops and progression ideas." },
  { id: "trailer_movie_concept_agent", name: "Trailer / Movie Concept Agent", division: "content_studio", mission: "Plan cinematic trailers and feature hooks." },
  { id: "quality_gate_agent", name: "Quality Gate Agent", division: "quality", mission: "Reject weak or low-signal concepts." },
  { id: "style_consistency_agent", name: "Style Consistency Agent", division: "quality", mission: "Protect tone and visual integrity." },
  { id: "continuity_checker_agent", name: "Continuity Checker Agent", division: "quality", mission: "Catch canon drift and contradictions." },
  { id: "similarity_rights_risk_screener", name: "Similarity / Rights Risk Screener", division: "quality", mission: "Reduce derivative and legal risk." },
  { id: "duplication_detector_agent", name: "Duplication Detector", division: "quality", mission: "Avoid portfolio duplicates." },
  { id: "brand_safety_agent", name: "Brand Safety Agent", division: "quality", mission: "Block unsafe packaging or messaging." },
  { id: "publishing_scheduler_agent", name: "Publishing Scheduler Agent", division: "publishing", mission: "Sequence releases against channel fit." },
  { id: "packaging_agent", name: "Packaging Agent", division: "publishing", mission: "Turn concepts into release-ready packages." },
  { id: "headline_caption_agent", name: "Headline / Caption Agent", division: "publishing", mission: "Generate launch copy." },
  { id: "thumbnail_cover_planner", name: "Thumbnail / Cover Planner", division: "publishing", mission: "Design click-driving cover direction." },
  { id: "channel_routing_agent", name: "Channel Routing Agent", division: "publishing", mission: "Map content to surfaces." },
  { id: "performance_analyst_agent", name: "Performance Analyst Agent", division: "franchise_development", mission: "Score outcomes and learning loops." },
  { id: "franchise_manager_agent", name: "Franchise Manager Agent", division: "franchise_development", mission: "Promote or retire concepts." },
  { id: "sequel_expansion_planner", name: "Sequel / Expansion Planner", division: "franchise_development", mission: "Plan expansions for winners." },
  { id: "portfolio_rebalancer_agent", name: "Portfolio Rebalancer", division: "franchise_development", mission: "Maintain portfolio diversity and budget discipline." }
];

export const SAMPLE_TREND_BRIEFS: TrendBrief[] = [
  {
    id: "trend_relic_punk",
    title: "Relic-Punk Optimism",
    summary: "Audiences are responding to tactile retro-futurist artifacts mixed with hopeful rebellion and found-family energy.",
    signalSources: ["creator notes", "internal curation gaps", "format experimentation"],
    themes: ["hopeful rebellion", "found family", "artifact mystery"],
    aesthetics: ["sun-faded chrome", "analog holograms", "desert neon"],
    emotions: ["wonder", "defiance", "belonging"],
    formats: ["image", "meme", "video_short", "game_concept", "movie_concept"],
    opportunityScore: 84,
    audienceTarget: {
      primary: "Gen Z sci-fi fandom",
      secondary: ["cosplay communities", "collectible art buyers"],
      emotions: ["wonder", "rebellion"],
      channels: ["home_feed", "shorts", "poster drops"]
    },
    createdAt: "2026-03-07T12:00:00.000Z"
  },
  {
    id: "trend_gothic_sports",
    title: "Gothic Sports Fever Dream",
    summary: "Absurdist sports mythology with gothic pageantry is underexplored and well-suited to memes, chants, and game loops.",
    signalSources: ["live events", "meme remix behavior", "franchise whitespace"],
    themes: ["ritual competition", "camp spectacle", "mascot mythology"],
    aesthetics: ["velvet smoke", "cathedral scoreboards", "bone-white uniforms"],
    emotions: ["awe", "chaos", "tribal pride"],
    formats: ["meme", "wall_post", "video_short", "music_concept", "game_concept"],
    opportunityScore: 79,
    audienceTarget: {
      primary: "internet-native sports fans",
      secondary: ["horror-comedy audiences", "streamer communities"],
      emotions: ["hype", "absurdity"],
      channels: ["wall", "shorts", "live companion"]
    },
    createdAt: "2026-03-07T12:01:00.000Z"
  },
  {
    id: "trend_oceanic_mystics",
    title: "Oceanic Mystic Comfort Epic",
    summary: "Soft-spoken ecological fantasy with ritual music and map-based exploration can scale across art, podcast, and game concepts.",
    signalSources: ["audience sentiment", "platform mood tracking", "content gap map"],
    themes: ["healing journeys", "song magic", "world restoration"],
    aesthetics: ["bioluminescent ink", "tide temples", "wind-stitched robes"],
    emotions: ["calm", "curiosity", "awe"],
    formats: ["artwork", "podcast_concept", "music_concept", "game_concept", "movie_concept"],
    opportunityScore: 82,
    audienceTarget: {
      primary: "cozy fantasy audiences",
      secondary: ["soundtrack listeners", "lore podcast fans"],
      emotions: ["comfort", "discovery"],
      channels: ["art drops", "audio pilots", "world guideposts"]
    },
    createdAt: "2026-03-07T12:02:00.000Z"
  }
];
