-- Phase 70: ILLUVRSE Media Corporation v1 persistence.

CREATE TYPE "MediaCorpPortfolioTier" AS ENUM ('KILL', 'TEST', 'INCUBATE', 'SCALE', 'FLAGSHIP');
CREATE TYPE "MediaCorpRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED');
CREATE TYPE "MediaCorpDivision" AS ENUM ('BOARD', 'RESEARCH', 'IP_FOUNDRY', 'CONTENT_STUDIO', 'QUALITY', 'PUBLISHING', 'FRANCHISE_DEVELOPMENT');
CREATE TYPE "MediaCorpFormat" AS ENUM ('IMAGE', 'ARTWORK', 'MEME', 'WALL_POST', 'VIDEO_SHORT', 'MUSIC_CONCEPT', 'PODCAST_CONCEPT', 'GAME_CONCEPT', 'MOVIE_CONCEPT');

CREATE TABLE "MediaTrendBrief" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "opportunityScore" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaTrendBrief_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaFranchiseSeed" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "MediaCorpPortfolioTier" NOT NULL DEFAULT 'TEST',
  "trendBriefExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaFranchiseSeed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaFranchise" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tier" "MediaCorpPortfolioTier" NOT NULL DEFAULT 'TEST',
  "status" "MediaCorpPortfolioTier" NOT NULL DEFAULT 'TEST',
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaFranchise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaCanonRecord" (
  "id" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaCanonRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaContentPlan" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "seedExternalId" TEXT NOT NULL,
  "format" "MediaCorpFormat" NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaContentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaQualityScorecard" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "seedExternalId" TEXT NOT NULL,
  "decision" "MediaCorpPortfolioTier" NOT NULL,
  "overall" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaQualityScorecard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPublishPlan" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "contentPlanExternalId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaPublishPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPerformanceReport" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "contentPlanExternalId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPerformanceReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAgentTask" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "division" "MediaCorpDivision" NOT NULL,
  "workflowId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "status" "MediaCorpRunStatus" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 3,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAgentTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAgentRun" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "taskExternalId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "status" "MediaCorpRunStatus" NOT NULL,
  "summary" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaMemoryEntry" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT,
  "agentId" TEXT,
  "kind" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaMemoryEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaWorldStateSnapshot" (
  "id" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaWorldStateSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaTrendBrief_externalId_key" ON "MediaTrendBrief"("externalId");
CREATE UNIQUE INDEX "MediaFranchiseSeed_slug_key" ON "MediaFranchiseSeed"("slug");
CREATE UNIQUE INDEX "MediaFranchise_slug_key" ON "MediaFranchise"("slug");
CREATE UNIQUE INDEX "MediaContentPlan_externalId_key" ON "MediaContentPlan"("externalId");
CREATE UNIQUE INDEX "MediaPublishPlan_externalId_key" ON "MediaPublishPlan"("externalId");
CREATE UNIQUE INDEX "MediaAgentTask_externalId_key" ON "MediaAgentTask"("externalId");
CREATE UNIQUE INDEX "MediaMemoryEntry_key_key" ON "MediaMemoryEntry"("key");

CREATE INDEX "MediaTrendBrief_createdAt_idx" ON "MediaTrendBrief"("createdAt");
CREATE INDEX "MediaFranchiseSeed_status_createdAt_idx" ON "MediaFranchiseSeed"("status", "createdAt");
CREATE INDEX "MediaFranchise_tier_updatedAt_idx" ON "MediaFranchise"("tier", "updatedAt");
CREATE INDEX "MediaCanonRecord_franchiseExternalId_version_idx" ON "MediaCanonRecord"("franchiseExternalId", "version");
CREATE INDEX "MediaContentPlan_franchiseExternalId_format_createdAt_idx" ON "MediaContentPlan"("franchiseExternalId", "format", "createdAt");
CREATE INDEX "MediaContentPlan_status_updatedAt_idx" ON "MediaContentPlan"("status", "updatedAt");
CREATE INDEX "MediaQualityScorecard_franchiseExternalId_createdAt_idx" ON "MediaQualityScorecard"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaQualityScorecard_decision_createdAt_idx" ON "MediaQualityScorecard"("decision", "createdAt");
CREATE INDEX "MediaPublishPlan_status_scheduledFor_idx" ON "MediaPublishPlan"("status", "scheduledFor");
CREATE INDEX "MediaPerformanceReport_franchiseExternalId_createdAt_idx" ON "MediaPerformanceReport"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaAgentTask_status_updatedAt_idx" ON "MediaAgentTask"("status", "updatedAt");
CREATE INDEX "MediaAgentTask_division_createdAt_idx" ON "MediaAgentTask"("division", "createdAt");
CREATE INDEX "MediaAgentRun_agentId_startedAt_idx" ON "MediaAgentRun"("agentId", "startedAt");
CREATE INDEX "MediaAgentRun_status_startedAt_idx" ON "MediaAgentRun"("status", "startedAt");
CREATE INDEX "MediaMemoryEntry_franchiseExternalId_createdAt_idx" ON "MediaMemoryEntry"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaMemoryEntry_agentId_createdAt_idx" ON "MediaMemoryEntry"("agentId", "createdAt");
CREATE INDEX "MediaWorldStateSnapshot_generatedAt_idx" ON "MediaWorldStateSnapshot"("generatedAt");
