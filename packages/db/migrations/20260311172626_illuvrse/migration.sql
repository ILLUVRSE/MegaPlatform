-- AlterTable
ALTER TABLE "PlatformEntitlement" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlatformNotification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlatformPresence" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlatformSessionGraph" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Squad" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SquadInvite" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SquadMember" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "MediaArtifactReviewScorecard_artifactBundleExternalId_createdAt" RENAME TO "MediaArtifactReviewScorecard_artifactBundleExternalId_creat_idx";

-- RenameIndex
ALTER INDEX "MediaContentMetricsRollup_artifactBundleExternalId_createdAt_id" RENAME TO "MediaContentMetricsRollup_artifactBundleExternalId_createdA_idx";

-- RenameIndex
ALTER INDEX "MediaDecisionInputSnapshot_planningCycleExternalId_createdAt_id" RENAME TO "MediaDecisionInputSnapshot_planningCycleExternalId_createdA_idx";

-- RenameIndex
ALTER INDEX "MediaDistributionPackage_releaseCandidateExternalId_createdAt_i" RENAME TO "MediaDistributionPackage_releaseCandidateExternalId_created_idx";

-- RenameIndex
ALTER INDEX "MediaExperimentAssignment_releaseCandidateExternalId_updatedAt_" RENAME TO "MediaExperimentAssignment_releaseCandidateExternalId_update_idx";

-- RenameIndex
ALTER INDEX "MediaPlanOutcomeExpectation_executivePlanExternalId_createdAt_i" RENAME TO "MediaPlanOutcomeExpectation_executivePlanExternalId_created_idx";

-- RenameIndex
ALTER INDEX "MediaPromptPerformanceRollup_promptTemplateExternalId_createdAt" RENAME TO "MediaPromptPerformanceRollup_promptTemplateExternalId_creat_idx";
