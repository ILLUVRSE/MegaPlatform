-- Phase 72: ILLUVRSE Media Corporation distribution and learning v3.

CREATE TYPE "MediaCorpChannelType" AS ENUM (
  'WALL_POSTS',
  'SHORTS_FEED',
  'FEATURED_CARDS',
  'HOME_FEED_MODULE',
  'NEWSLETTER_DIGEST',
  'PODCAST_FEED',
  'FRANCHISE_LANDING_PAGE',
  'GAME_DISCOVERY_SHELF',
  'SANDBOX_DEMO'
);

CREATE TYPE "MediaCorpPublishAttemptStatus" AS ENUM (
  'QUEUED',
  'SCHEDULED',
  'IMMEDIATE',
  'DRY_RUN',
  'SANDBOX',
  'FAILED',
  'CANCELLED',
  'PUBLISHED',
  'PARTIALLY_PUBLISHED'
);

CREATE TYPE "MediaCorpCampaignType" AS ENUM (
  'FRANCHISE_LAUNCH',
  'SEASONAL_DROP',
  'CHARACTER_INTRODUCTION',
  'MEME_BURST',
  'SHORTS_BURST',
  'PODCAST_PROMO_RUN',
  'TRAILER_PUSH',
  'GAME_CONCEPT_TEST_WAVE'
);

CREATE TYPE "MediaCorpExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED');
CREATE TYPE "MediaCorpRecommendationType" AS ENUM (
  'INCREASE_FRANCHISE_MOMENTUM',
  'DECREASE_FRANCHISE_MOMENTUM',
  'PROMOTE_TIER',
  'SUPPRESS_FORMAT',
  'PRIORITIZE_CHANNEL',
  'RECOMMEND_SEQUEL',
  'RECOMMEND_SPINOFF',
  'RECOMMEND_CAMPAIGN',
  'RECOMMEND_REWORK'
);

CREATE TABLE "MediaDistributionChannel" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "MediaCorpChannelType" NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaDistributionChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPublishTarget" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPublishTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPublishWindow" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPublishWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPublishResult" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "publishAttemptExternalId" TEXT NOT NULL,
  "status" "MediaCorpPublishAttemptStatus" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPublishResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPublishAttempt" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "releaseCandidateExternalId" TEXT NOT NULL,
  "distributionPackageExternalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "publishTargetExternalId" TEXT NOT NULL,
  "publishWindowExternalId" TEXT,
  "status" "MediaCorpPublishAttemptStatus" NOT NULL,
  "mode" TEXT NOT NULL,
  "adapterKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaPublishAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAudienceSegment" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAudienceSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaCampaign" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "type" "MediaCorpCampaignType" NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaCampaignItem" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "campaignExternalId" TEXT NOT NULL,
  "releaseCandidateExternalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "publishAttemptExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaCampaignItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaExperimentAssignment" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "releaseCandidateExternalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "status" "MediaCorpExperimentStatus" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaExperimentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPerformanceEvent" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "publishAttemptExternalId" TEXT NOT NULL,
  "releaseCandidateExternalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPerformanceEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPerformanceSnapshot" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "publishAttemptExternalId" TEXT NOT NULL,
  "releaseCandidateExternalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaContentMetricsRollup" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "releaseCandidateExternalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaContentMetricsRollup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaChannelMetricsRollup" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "channelExternalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaChannelMetricsRollup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaFranchiseMetricsRollup" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaFranchiseMetricsRollup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPromptPerformanceRollup" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "promptTemplateExternalId" TEXT NOT NULL,
  "promptRunExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPromptPerformanceRollup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAgentPerformanceRollup" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAgentPerformanceRollup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaStrategyRecommendation" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "recommendationType" "MediaCorpRecommendationType" NOT NULL,
  "franchiseExternalId" TEXT,
  "channelExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaStrategyRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaDistributionChannel_externalId_key" ON "MediaDistributionChannel"("externalId");
CREATE UNIQUE INDEX "MediaDistributionChannel_slug_key" ON "MediaDistributionChannel"("slug");
CREATE UNIQUE INDEX "MediaPublishTarget_externalId_key" ON "MediaPublishTarget"("externalId");
CREATE UNIQUE INDEX "MediaPublishWindow_externalId_key" ON "MediaPublishWindow"("externalId");
CREATE UNIQUE INDEX "MediaPublishResult_externalId_key" ON "MediaPublishResult"("externalId");
CREATE UNIQUE INDEX "MediaPublishAttempt_externalId_key" ON "MediaPublishAttempt"("externalId");
CREATE UNIQUE INDEX "MediaAudienceSegment_externalId_key" ON "MediaAudienceSegment"("externalId");
CREATE UNIQUE INDEX "MediaCampaign_externalId_key" ON "MediaCampaign"("externalId");
CREATE UNIQUE INDEX "MediaCampaignItem_externalId_key" ON "MediaCampaignItem"("externalId");
CREATE UNIQUE INDEX "MediaExperimentAssignment_externalId_key" ON "MediaExperimentAssignment"("externalId");
CREATE UNIQUE INDEX "MediaPerformanceEvent_externalId_key" ON "MediaPerformanceEvent"("externalId");
CREATE UNIQUE INDEX "MediaPerformanceSnapshot_externalId_key" ON "MediaPerformanceSnapshot"("externalId");
CREATE UNIQUE INDEX "MediaContentMetricsRollup_externalId_key" ON "MediaContentMetricsRollup"("externalId");
CREATE UNIQUE INDEX "MediaChannelMetricsRollup_externalId_key" ON "MediaChannelMetricsRollup"("externalId");
CREATE UNIQUE INDEX "MediaFranchiseMetricsRollup_externalId_key" ON "MediaFranchiseMetricsRollup"("externalId");
CREATE UNIQUE INDEX "MediaPromptPerformanceRollup_externalId_key" ON "MediaPromptPerformanceRollup"("externalId");
CREATE UNIQUE INDEX "MediaAgentPerformanceRollup_externalId_key" ON "MediaAgentPerformanceRollup"("externalId");
CREATE UNIQUE INDEX "MediaStrategyRecommendation_externalId_key" ON "MediaStrategyRecommendation"("externalId");

CREATE INDEX "MediaDistributionChannel_type_updatedAt_idx" ON "MediaDistributionChannel"("type", "updatedAt");
CREATE INDEX "MediaPublishTarget_channelExternalId_createdAt_idx" ON "MediaPublishTarget"("channelExternalId", "createdAt");
CREATE INDEX "MediaPublishWindow_channelExternalId_createdAt_idx" ON "MediaPublishWindow"("channelExternalId", "createdAt");
CREATE INDEX "MediaPublishResult_publishAttemptExternalId_createdAt_idx" ON "MediaPublishResult"("publishAttemptExternalId", "createdAt");
CREATE INDEX "MediaPublishAttempt_channelExternalId_updatedAt_idx" ON "MediaPublishAttempt"("channelExternalId", "updatedAt");
CREATE INDEX "MediaPublishAttempt_status_updatedAt_idx" ON "MediaPublishAttempt"("status", "updatedAt");
CREATE INDEX "MediaCampaign_franchiseExternalId_updatedAt_idx" ON "MediaCampaign"("franchiseExternalId", "updatedAt");
CREATE INDEX "MediaCampaignItem_campaignExternalId_createdAt_idx" ON "MediaCampaignItem"("campaignExternalId", "createdAt");
CREATE INDEX "MediaExperimentAssignment_releaseCandidateExternalId_updatedAt_idx" ON "MediaExperimentAssignment"("releaseCandidateExternalId", "updatedAt");
CREATE INDEX "MediaPerformanceEvent_publishAttemptExternalId_createdAt_idx" ON "MediaPerformanceEvent"("publishAttemptExternalId", "createdAt");
CREATE INDEX "MediaPerformanceEvent_franchiseExternalId_createdAt_idx" ON "MediaPerformanceEvent"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaPerformanceSnapshot_publishAttemptExternalId_createdAt_idx" ON "MediaPerformanceSnapshot"("publishAttemptExternalId", "createdAt");
CREATE INDEX "MediaPerformanceSnapshot_channelExternalId_createdAt_idx" ON "MediaPerformanceSnapshot"("channelExternalId", "createdAt");
CREATE INDEX "MediaContentMetricsRollup_artifactBundleExternalId_createdAt_idx" ON "MediaContentMetricsRollup"("artifactBundleExternalId", "createdAt");
CREATE INDEX "MediaChannelMetricsRollup_channelExternalId_createdAt_idx" ON "MediaChannelMetricsRollup"("channelExternalId", "createdAt");
CREATE INDEX "MediaFranchiseMetricsRollup_franchiseExternalId_createdAt_idx" ON "MediaFranchiseMetricsRollup"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaPromptPerformanceRollup_promptTemplateExternalId_createdAt_idx" ON "MediaPromptPerformanceRollup"("promptTemplateExternalId", "createdAt");
CREATE INDEX "MediaAgentPerformanceRollup_agentId_createdAt_idx" ON "MediaAgentPerformanceRollup"("agentId", "createdAt");
CREATE INDEX "MediaStrategyRecommendation_recommendationType_createdAt_idx" ON "MediaStrategyRecommendation"("recommendationType", "createdAt");
CREATE INDEX "MediaStrategyRecommendation_franchiseExternalId_createdAt_idx" ON "MediaStrategyRecommendation"("franchiseExternalId", "createdAt");
