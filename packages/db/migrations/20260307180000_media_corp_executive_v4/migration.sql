-- Phase 4: media-corp executive autonomy models for goals, budgets, planning, governance, and explainability.

CREATE TYPE "MediaCorpGoalType" AS ENUM (
  'AUDIENCE_GROWTH',
  'ENGAGEMENT_GROWTH',
  'FRANCHISE_INCUBATION',
  'FRANCHISE_SCALING',
  'CREATOR_CONTENT_VOLUME',
  'CHANNEL_EXPANSION',
  'EXPERIMENT_THROUGHPUT',
  'COST_EFFICIENCY',
  'ORIGINALITY_IMPROVEMENT',
  'CONTENT_QUALITY_IMPROVEMENT',
  'SAFE_PUBLISHING'
);

CREATE TYPE "MediaCorpConstraintMode" AS ENUM ('HARD', 'SOFT');

CREATE TYPE "MediaCorpBudgetScope" AS ENUM (
  'GENERATION_JOBS',
  'CAMPAIGN_VOLUME',
  'CHANNEL_SLOTS',
  'EXPERIMENT_SLOTS',
  'FRANCHISE_INVESTMENT',
  'COMPUTE_TOKENS',
  'HUMAN_REVIEW_CAPACITY',
  'PUBLISHING_CADENCE'
);

CREATE TYPE "MediaCorpBudgetInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CAMPAIGN');

CREATE TYPE "MediaCorpResourcePoolKind" AS ENUM ('BUDGET', 'CAPACITY', 'SLOT', 'QUEUE', 'REVIEW_BANDWIDTH', 'TOKEN_QUOTA');

CREATE TYPE "MediaCorpExecutivePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'COMPLETED', 'CANCELLED');

CREATE TYPE "MediaCorpExecutiveCycleType" AS ENUM (
  'DAILY_OPERATING_REVIEW',
  'WEEKLY_PORTFOLIO_REVIEW',
  'CAMPAIGN_LAUNCH_CYCLE',
  'EXPERIMENT_REVIEW_CYCLE',
  'MONTHLY_FRANCHISE_INVESTMENT_REVIEW',
  'BUDGET_REBALANCE_CYCLE'
);

CREATE TYPE "MediaCorpDirectiveActionType" AS ENUM (
  'INCREASE_FORMAT_OUTPUT',
  'DECREASE_FORMAT_OUTPUT',
  'LAUNCH_CAMPAIGN',
  'PAUSE_CHANNEL_MIX',
  'REQUEST_SEQUEL_ASSETS',
  'QUEUE_TREND_BRIEF',
  'SEED_FRANCHISE',
  'PRODUCE_BUNDLE',
  'CHANGE_REVIEW_PRIORITY',
  'SCHEDULE_PUBLISH_WAVE',
  'CREATE_EXPERIMENT',
  'TRIGGER_REWORK',
  'ARCHIVE_CONCEPT',
  'PROMOTE_FRANCHISE',
  'PAUSE_FRANCHISE',
  'SUNSET_FRANCHISE',
  'REBALANCE_BUDGET'
);

CREATE TYPE "MediaCorpPlanAssignmentStatus" AS ENUM (
  'PLANNED',
  'QUEUED',
  'AWAITING_APPROVAL',
  'RUNNING',
  'COMPLETED',
  'BLOCKED',
  'CANCELLED'
);

CREATE TYPE "MediaCorpAutonomyMode" AS ENUM (
  'MANUAL_ONLY',
  'ADVISORY',
  'SEMI_AUTONOMOUS',
  'FULLY_AUTONOMOUS_SANDBOX',
  'FULLY_AUTONOMOUS_CONSTRAINED'
);

CREATE TYPE "MediaCorpPolicySeverity" AS ENUM ('INFO', 'WARNING', 'BLOCK');
CREATE TYPE "MediaCorpApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "MediaCorpOverrideStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "MediaCorpForecastMetric" AS ENUM (
  'CONTENT_OUTPUT',
  'CAMPAIGN_REACH',
  'BUDGET_BURN',
  'ENGAGEMENT_UPLIFT',
  'FRANCHISE_MOMENTUM',
  'REVIEW_QUEUE_LOAD'
);

CREATE TABLE "MediaStrategicGoal" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "goalType" "MediaCorpGoalType" NOT NULL,
  "title" TEXT NOT NULL,
  "priorityWeight" INTEGER NOT NULL,
  "constraintMode" "MediaCorpConstraintMode" NOT NULL,
  "franchiseExternalId" TEXT,
  "channelExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaStrategicGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGoalTarget" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "goalExternalId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "targetValue" DOUBLE PRECISION,
  "minValue" DOUBLE PRECISION,
  "maxValue" DOUBLE PRECISION,
  "unit" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaGoalTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGoalWindow" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "goalExternalId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "cadence" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaGoalWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGoalProgress" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "goalExternalId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "attainmentPct" DOUBLE PRECISION NOT NULL,
  "payload" JSONB NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaGoalProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGoalConflict" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "goalExternalId" TEXT NOT NULL,
  "conflictingGoalExternalId" TEXT NOT NULL,
  "conflictType" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaGoalConflict_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGoalEvaluation" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "goalExternalId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaGoalEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGoalPriorityProfile" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "goalExternalId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL,
  "urgency" INTEGER NOT NULL,
  "expectedLeverage" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaGoalPriorityProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaBudget" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scope" "MediaCorpBudgetScope" NOT NULL,
  "interval" "MediaCorpBudgetInterval" NOT NULL,
  "allocatedAmount" DOUBLE PRECISION NOT NULL,
  "consumedAmount" DOUBLE PRECISION NOT NULL,
  "reservedAmount" DOUBLE PRECISION NOT NULL,
  "remainingAmount" DOUBLE PRECISION NOT NULL,
  "currencyOrUnit" TEXT NOT NULL,
  "franchiseExternalId" TEXT,
  "channelExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaBudget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaBudgetAllocation" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "budgetExternalId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetExternalId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "reservedAmount" DOUBLE PRECISION NOT NULL,
  "consumedAmount" DOUBLE PRECISION NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaBudgetAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaResourcePool" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "MediaCorpResourcePoolKind" NOT NULL,
  "totalCapacity" DOUBLE PRECISION NOT NULL,
  "reservedCapacity" DOUBLE PRECISION NOT NULL,
  "consumedCapacity" DOUBLE PRECISION NOT NULL,
  "remainingCapacity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "franchiseExternalId" TEXT,
  "channelExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaResourcePool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaCapacityWindow" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "resourcePoolExternalId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "totalCapacity" DOUBLE PRECISION NOT NULL,
  "reservedCapacity" DOUBLE PRECISION NOT NULL,
  "consumedCapacity" DOUBLE PRECISION NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaCapacityWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaSpendEvent" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "budgetExternalId" TEXT,
  "allocationExternalId" TEXT,
  "resourcePoolExternalId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaSpendEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAllocationDecision" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "budgetExternalId" TEXT,
  "resourcePoolExternalId" TEXT,
  "targetType" TEXT NOT NULL,
  "targetExternalId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAllocationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaBudgetGuardrail" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "budgetExternalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "severity" "MediaCorpPolicySeverity" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaBudgetGuardrail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPlanningCycle" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "cycleType" "MediaCorpExecutiveCycleType" NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "autonomyMode" "MediaCorpAutonomyMode" NOT NULL,
  "payload" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPlanningCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaExecutivePlan" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "planningCycleExternalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "MediaCorpExecutivePlanStatus" NOT NULL,
  "autonomyMode" "MediaCorpAutonomyMode" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaExecutivePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPlanObjective" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "executivePlanExternalId" TEXT NOT NULL,
  "strategicGoalExternalId" TEXT,
  "title" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPlanObjective_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPlanDirective" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "executivePlanExternalId" TEXT NOT NULL,
  "planObjectiveExternalId" TEXT,
  "actionType" "MediaCorpDirectiveActionType" NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetExternalId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaPlanDirective_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPlanAssignment" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "planDirectiveExternalId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "status" "MediaCorpPlanAssignmentStatus" NOT NULL,
  "downstreamTaskExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaPlanAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPlanDecision" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "executivePlanExternalId" TEXT NOT NULL,
  "planDirectiveExternalId" TEXT,
  "decisionType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPlanDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPlanOutcomeExpectation" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "executivePlanExternalId" TEXT NOT NULL,
  "planDirectiveExternalId" TEXT,
  "metric" TEXT NOT NULL,
  "baselineValue" DOUBLE PRECISION NOT NULL,
  "expectedValue" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPlanOutcomeExpectation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGovernancePolicy" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "autonomyMode" "MediaCorpAutonomyMode" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaGovernancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaApprovalRule" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "governancePolicyExternalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "approverRole" TEXT NOT NULL,
  "status" "MediaCorpApprovalStatus" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaApprovalRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAutonomyMode" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "mode" "MediaCorpAutonomyMode" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAutonomyMode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaDecisionGuardrail" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "governancePolicyExternalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "severity" "MediaCorpPolicySeverity" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaDecisionGuardrail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaEscalationRule" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "governancePolicyExternalId" TEXT,
  "triggerType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaEscalationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPolicyViolation" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "governancePolicyExternalId" TEXT NOT NULL,
  "decisionGuardrailExternalId" TEXT,
  "decisionLogExternalId" TEXT,
  "planDirectiveExternalId" TEXT,
  "severity" "MediaCorpPolicySeverity" NOT NULL,
  "resolutionStatus" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "MediaPolicyViolation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaManualOverride" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetExternalId" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "status" "MediaCorpOverrideStatus" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "MediaManualOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaFreezeWindow" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaFreezeWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaDecisionLog" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "planningCycleExternalId" TEXT,
  "executivePlanExternalId" TEXT,
  "planDirectiveExternalId" TEXT,
  "decisionType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaDecisionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaDecisionInputSnapshot" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "decisionLogExternalId" TEXT,
  "planningCycleExternalId" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaDecisionInputSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaDecisionReason" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "decisionLogExternalId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaDecisionReason_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAlternativeConsidered" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "decisionLogExternalId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAlternativeConsidered_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaConfidenceAssessment" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "decisionLogExternalId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaConfidenceAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaExpectedImpact" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "decisionLogExternalId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "baselineValue" DOUBLE PRECISION NOT NULL,
  "expectedValue" DOUBLE PRECISION NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaExpectedImpact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPostHocEvaluation" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "decisionLogExternalId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPostHocEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaForecastRecord" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "planningCycleExternalId" TEXT,
  "executivePlanExternalId" TEXT,
  "metric" "MediaCorpForecastMetric" NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetExternalId" TEXT,
  "baselineValue" DOUBLE PRECISION NOT NULL,
  "forecastValue" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaForecastRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaStrategicGoal_externalId_key" ON "MediaStrategicGoal"("externalId");
CREATE UNIQUE INDEX "MediaGoalTarget_externalId_key" ON "MediaGoalTarget"("externalId");
CREATE UNIQUE INDEX "MediaGoalWindow_externalId_key" ON "MediaGoalWindow"("externalId");
CREATE UNIQUE INDEX "MediaGoalWindow_goalExternalId_key" ON "MediaGoalWindow"("goalExternalId");
CREATE UNIQUE INDEX "MediaGoalProgress_externalId_key" ON "MediaGoalProgress"("externalId");
CREATE UNIQUE INDEX "MediaGoalConflict_externalId_key" ON "MediaGoalConflict"("externalId");
CREATE UNIQUE INDEX "MediaGoalEvaluation_externalId_key" ON "MediaGoalEvaluation"("externalId");
CREATE UNIQUE INDEX "MediaGoalPriorityProfile_externalId_key" ON "MediaGoalPriorityProfile"("externalId");
CREATE UNIQUE INDEX "MediaGoalPriorityProfile_goalExternalId_key" ON "MediaGoalPriorityProfile"("goalExternalId");
CREATE UNIQUE INDEX "MediaBudget_externalId_key" ON "MediaBudget"("externalId");
CREATE UNIQUE INDEX "MediaBudgetAllocation_externalId_key" ON "MediaBudgetAllocation"("externalId");
CREATE UNIQUE INDEX "MediaResourcePool_externalId_key" ON "MediaResourcePool"("externalId");
CREATE UNIQUE INDEX "MediaCapacityWindow_externalId_key" ON "MediaCapacityWindow"("externalId");
CREATE UNIQUE INDEX "MediaSpendEvent_externalId_key" ON "MediaSpendEvent"("externalId");
CREATE UNIQUE INDEX "MediaAllocationDecision_externalId_key" ON "MediaAllocationDecision"("externalId");
CREATE UNIQUE INDEX "MediaBudgetGuardrail_externalId_key" ON "MediaBudgetGuardrail"("externalId");
CREATE UNIQUE INDEX "MediaPlanningCycle_externalId_key" ON "MediaPlanningCycle"("externalId");
CREATE UNIQUE INDEX "MediaExecutivePlan_externalId_key" ON "MediaExecutivePlan"("externalId");
CREATE UNIQUE INDEX "MediaPlanObjective_externalId_key" ON "MediaPlanObjective"("externalId");
CREATE UNIQUE INDEX "MediaPlanDirective_externalId_key" ON "MediaPlanDirective"("externalId");
CREATE UNIQUE INDEX "MediaPlanAssignment_externalId_key" ON "MediaPlanAssignment"("externalId");
CREATE UNIQUE INDEX "MediaPlanDecision_externalId_key" ON "MediaPlanDecision"("externalId");
CREATE UNIQUE INDEX "MediaPlanOutcomeExpectation_externalId_key" ON "MediaPlanOutcomeExpectation"("externalId");
CREATE UNIQUE INDEX "MediaGovernancePolicy_externalId_key" ON "MediaGovernancePolicy"("externalId");
CREATE UNIQUE INDEX "MediaApprovalRule_externalId_key" ON "MediaApprovalRule"("externalId");
CREATE UNIQUE INDEX "MediaAutonomyMode_externalId_key" ON "MediaAutonomyMode"("externalId");
CREATE UNIQUE INDEX "MediaDecisionGuardrail_externalId_key" ON "MediaDecisionGuardrail"("externalId");
CREATE UNIQUE INDEX "MediaEscalationRule_externalId_key" ON "MediaEscalationRule"("externalId");
CREATE UNIQUE INDEX "MediaPolicyViolation_externalId_key" ON "MediaPolicyViolation"("externalId");
CREATE UNIQUE INDEX "MediaManualOverride_externalId_key" ON "MediaManualOverride"("externalId");
CREATE UNIQUE INDEX "MediaFreezeWindow_externalId_key" ON "MediaFreezeWindow"("externalId");
CREATE UNIQUE INDEX "MediaDecisionLog_externalId_key" ON "MediaDecisionLog"("externalId");
CREATE UNIQUE INDEX "MediaDecisionInputSnapshot_externalId_key" ON "MediaDecisionInputSnapshot"("externalId");
CREATE UNIQUE INDEX "MediaDecisionReason_externalId_key" ON "MediaDecisionReason"("externalId");
CREATE UNIQUE INDEX "MediaAlternativeConsidered_externalId_key" ON "MediaAlternativeConsidered"("externalId");
CREATE UNIQUE INDEX "MediaConfidenceAssessment_externalId_key" ON "MediaConfidenceAssessment"("externalId");
CREATE UNIQUE INDEX "MediaConfidenceAssessment_decisionLogExternalId_key" ON "MediaConfidenceAssessment"("decisionLogExternalId");
CREATE UNIQUE INDEX "MediaExpectedImpact_externalId_key" ON "MediaExpectedImpact"("externalId");
CREATE UNIQUE INDEX "MediaPostHocEvaluation_externalId_key" ON "MediaPostHocEvaluation"("externalId");
CREATE UNIQUE INDEX "MediaPostHocEvaluation_decisionLogExternalId_key" ON "MediaPostHocEvaluation"("decisionLogExternalId");
CREATE UNIQUE INDEX "MediaForecastRecord_externalId_key" ON "MediaForecastRecord"("externalId");

CREATE INDEX "MediaStrategicGoal_goalType_updatedAt_idx" ON "MediaStrategicGoal"("goalType", "updatedAt");
CREATE INDEX "MediaStrategicGoal_franchiseExternalId_updatedAt_idx" ON "MediaStrategicGoal"("franchiseExternalId", "updatedAt");
CREATE INDEX "MediaGoalTarget_goalExternalId_createdAt_idx" ON "MediaGoalTarget"("goalExternalId", "createdAt");
CREATE INDEX "MediaGoalTarget_metric_createdAt_idx" ON "MediaGoalTarget"("metric", "createdAt");
CREATE INDEX "MediaGoalWindow_startAt_endAt_idx" ON "MediaGoalWindow"("startAt", "endAt");
CREATE INDEX "MediaGoalProgress_goalExternalId_measuredAt_idx" ON "MediaGoalProgress"("goalExternalId", "measuredAt");
CREATE INDEX "MediaGoalProgress_status_measuredAt_idx" ON "MediaGoalProgress"("status", "measuredAt");
CREATE INDEX "MediaGoalConflict_goalExternalId_createdAt_idx" ON "MediaGoalConflict"("goalExternalId", "createdAt");
CREATE INDEX "MediaGoalConflict_conflictingGoalExternalId_createdAt_idx" ON "MediaGoalConflict"("conflictingGoalExternalId", "createdAt");
CREATE INDEX "MediaGoalEvaluation_goalExternalId_measuredAt_idx" ON "MediaGoalEvaluation"("goalExternalId", "measuredAt");
CREATE INDEX "MediaGoalEvaluation_status_measuredAt_idx" ON "MediaGoalEvaluation"("status", "measuredAt");
CREATE INDEX "MediaGoalPriorityProfile_weight_updatedAt_idx" ON "MediaGoalPriorityProfile"("weight", "updatedAt");
CREATE INDEX "MediaBudget_scope_updatedAt_idx" ON "MediaBudget"("scope", "updatedAt");
CREATE INDEX "MediaBudget_franchiseExternalId_updatedAt_idx" ON "MediaBudget"("franchiseExternalId", "updatedAt");
CREATE INDEX "MediaBudgetAllocation_budgetExternalId_updatedAt_idx" ON "MediaBudgetAllocation"("budgetExternalId", "updatedAt");
CREATE INDEX "MediaBudgetAllocation_targetType_targetExternalId_idx" ON "MediaBudgetAllocation"("targetType", "targetExternalId");
CREATE INDEX "MediaResourcePool_kind_updatedAt_idx" ON "MediaResourcePool"("kind", "updatedAt");
CREATE INDEX "MediaResourcePool_franchiseExternalId_updatedAt_idx" ON "MediaResourcePool"("franchiseExternalId", "updatedAt");
CREATE INDEX "MediaCapacityWindow_resourcePoolExternalId_startAt_idx" ON "MediaCapacityWindow"("resourcePoolExternalId", "startAt");
CREATE INDEX "MediaCapacityWindow_startAt_endAt_idx" ON "MediaCapacityWindow"("startAt", "endAt");
CREATE INDEX "MediaSpendEvent_budgetExternalId_createdAt_idx" ON "MediaSpendEvent"("budgetExternalId", "createdAt");
CREATE INDEX "MediaSpendEvent_resourcePoolExternalId_createdAt_idx" ON "MediaSpendEvent"("resourcePoolExternalId", "createdAt");
CREATE INDEX "MediaAllocationDecision_budgetExternalId_createdAt_idx" ON "MediaAllocationDecision"("budgetExternalId", "createdAt");
CREATE INDEX "MediaAllocationDecision_targetType_targetExternalId_idx" ON "MediaAllocationDecision"("targetType", "targetExternalId");
CREATE INDEX "MediaBudgetGuardrail_budgetExternalId_createdAt_idx" ON "MediaBudgetGuardrail"("budgetExternalId", "createdAt");
CREATE INDEX "MediaBudgetGuardrail_severity_createdAt_idx" ON "MediaBudgetGuardrail"("severity", "createdAt");
CREATE INDEX "MediaPlanningCycle_cycleType_startedAt_idx" ON "MediaPlanningCycle"("cycleType", "startedAt");
CREATE INDEX "MediaPlanningCycle_status_startedAt_idx" ON "MediaPlanningCycle"("status", "startedAt");
CREATE INDEX "MediaExecutivePlan_planningCycleExternalId_updatedAt_idx" ON "MediaExecutivePlan"("planningCycleExternalId", "updatedAt");
CREATE INDEX "MediaExecutivePlan_status_updatedAt_idx" ON "MediaExecutivePlan"("status", "updatedAt");
CREATE INDEX "MediaPlanObjective_executivePlanExternalId_createdAt_idx" ON "MediaPlanObjective"("executivePlanExternalId", "createdAt");
CREATE INDEX "MediaPlanObjective_strategicGoalExternalId_createdAt_idx" ON "MediaPlanObjective"("strategicGoalExternalId", "createdAt");
CREATE INDEX "MediaPlanDirective_executivePlanExternalId_updatedAt_idx" ON "MediaPlanDirective"("executivePlanExternalId", "updatedAt");
CREATE INDEX "MediaPlanDirective_targetType_targetExternalId_idx" ON "MediaPlanDirective"("targetType", "targetExternalId");
CREATE INDEX "MediaPlanDirective_status_updatedAt_idx" ON "MediaPlanDirective"("status", "updatedAt");
CREATE INDEX "MediaPlanAssignment_planDirectiveExternalId_updatedAt_idx" ON "MediaPlanAssignment"("planDirectiveExternalId", "updatedAt");
CREATE INDEX "MediaPlanAssignment_status_updatedAt_idx" ON "MediaPlanAssignment"("status", "updatedAt");
CREATE INDEX "MediaPlanDecision_executivePlanExternalId_createdAt_idx" ON "MediaPlanDecision"("executivePlanExternalId", "createdAt");
CREATE INDEX "MediaPlanDecision_planDirectiveExternalId_createdAt_idx" ON "MediaPlanDecision"("planDirectiveExternalId", "createdAt");
CREATE INDEX "MediaPlanOutcomeExpectation_executivePlanExternalId_createdAt_idx" ON "MediaPlanOutcomeExpectation"("executivePlanExternalId", "createdAt");
CREATE INDEX "MediaPlanOutcomeExpectation_metric_createdAt_idx" ON "MediaPlanOutcomeExpectation"("metric", "createdAt");
CREATE INDEX "MediaGovernancePolicy_autonomyMode_updatedAt_idx" ON "MediaGovernancePolicy"("autonomyMode", "updatedAt");
CREATE INDEX "MediaGovernancePolicy_enabled_updatedAt_idx" ON "MediaGovernancePolicy"("enabled", "updatedAt");
CREATE INDEX "MediaApprovalRule_governancePolicyExternalId_createdAt_idx" ON "MediaApprovalRule"("governancePolicyExternalId", "createdAt");
CREATE INDEX "MediaApprovalRule_status_createdAt_idx" ON "MediaApprovalRule"("status", "createdAt");
CREATE INDEX "MediaAutonomyMode_mode_updatedAt_idx" ON "MediaAutonomyMode"("mode", "updatedAt");
CREATE INDEX "MediaAutonomyMode_isActive_updatedAt_idx" ON "MediaAutonomyMode"("isActive", "updatedAt");
CREATE INDEX "MediaDecisionGuardrail_governancePolicyExternalId_createdAt_idx" ON "MediaDecisionGuardrail"("governancePolicyExternalId", "createdAt");
CREATE INDEX "MediaDecisionGuardrail_severity_createdAt_idx" ON "MediaDecisionGuardrail"("severity", "createdAt");
CREATE INDEX "MediaEscalationRule_governancePolicyExternalId_createdAt_idx" ON "MediaEscalationRule"("governancePolicyExternalId", "createdAt");
CREATE INDEX "MediaEscalationRule_triggerType_createdAt_idx" ON "MediaEscalationRule"("triggerType", "createdAt");
CREATE INDEX "MediaPolicyViolation_governancePolicyExternalId_createdAt_idx" ON "MediaPolicyViolation"("governancePolicyExternalId", "createdAt");
CREATE INDEX "MediaPolicyViolation_resolutionStatus_createdAt_idx" ON "MediaPolicyViolation"("resolutionStatus", "createdAt");
CREATE INDEX "MediaManualOverride_targetType_targetExternalId_idx" ON "MediaManualOverride"("targetType", "targetExternalId");
CREATE INDEX "MediaManualOverride_status_createdAt_idx" ON "MediaManualOverride"("status", "createdAt");
CREATE INDEX "MediaFreezeWindow_startAt_endAt_idx" ON "MediaFreezeWindow"("startAt", "endAt");
CREATE INDEX "MediaDecisionLog_planningCycleExternalId_createdAt_idx" ON "MediaDecisionLog"("planningCycleExternalId", "createdAt");
CREATE INDEX "MediaDecisionLog_executivePlanExternalId_createdAt_idx" ON "MediaDecisionLog"("executivePlanExternalId", "createdAt");
CREATE INDEX "MediaDecisionLog_planDirectiveExternalId_createdAt_idx" ON "MediaDecisionLog"("planDirectiveExternalId", "createdAt");
CREATE INDEX "MediaDecisionInputSnapshot_decisionLogExternalId_createdAt_idx" ON "MediaDecisionInputSnapshot"("decisionLogExternalId", "createdAt");
CREATE INDEX "MediaDecisionInputSnapshot_planningCycleExternalId_createdAt_idx" ON "MediaDecisionInputSnapshot"("planningCycleExternalId", "createdAt");
CREATE INDEX "MediaDecisionReason_decisionLogExternalId_createdAt_idx" ON "MediaDecisionReason"("decisionLogExternalId", "createdAt");
CREATE INDEX "MediaDecisionReason_kind_createdAt_idx" ON "MediaDecisionReason"("kind", "createdAt");
CREATE INDEX "MediaAlternativeConsidered_decisionLogExternalId_createdAt_idx" ON "MediaAlternativeConsidered"("decisionLogExternalId", "createdAt");
CREATE INDEX "MediaConfidenceAssessment_score_createdAt_idx" ON "MediaConfidenceAssessment"("score", "createdAt");
CREATE INDEX "MediaExpectedImpact_decisionLogExternalId_createdAt_idx" ON "MediaExpectedImpact"("decisionLogExternalId", "createdAt");
CREATE INDEX "MediaExpectedImpact_metric_createdAt_idx" ON "MediaExpectedImpact"("metric", "createdAt");
CREATE INDEX "MediaPostHocEvaluation_outcome_evaluatedAt_idx" ON "MediaPostHocEvaluation"("outcome", "evaluatedAt");
CREATE INDEX "MediaForecastRecord_planningCycleExternalId_createdAt_idx" ON "MediaForecastRecord"("planningCycleExternalId", "createdAt");
CREATE INDEX "MediaForecastRecord_executivePlanExternalId_createdAt_idx" ON "MediaForecastRecord"("executivePlanExternalId", "createdAt");
CREATE INDEX "MediaForecastRecord_metric_createdAt_idx" ON "MediaForecastRecord"("metric", "createdAt");
