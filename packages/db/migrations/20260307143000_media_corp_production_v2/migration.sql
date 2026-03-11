-- Phase 71: ILLUVRSE Media Corporation production pipelines v2.

CREATE TYPE "MediaCorpArtifactType" AS ENUM (
  'IMAGE_CONCEPT',
  'GENERATED_IMAGE',
  'MEME_VARIANT',
  'WALL_POST_COPY',
  'SHORTS_PACKAGE',
  'PODCAST_PACKAGE',
  'MUSIC_CONCEPT_PACK',
  'GAME_CONCEPT_PACK',
  'TRAILER_PACKAGE',
  'DISTRIBUTION_PACKAGE'
);

CREATE TYPE "MediaCorpArtifactStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'RELEASE_CANDIDATE',
  'PUBLISHED'
);

CREATE TYPE "MediaCorpGenerationJobType" AS ENUM (
  'GENERATE_IMAGE',
  'GENERATE_MEME_SET',
  'GENERATE_WALL_POST',
  'GENERATE_SHORTS_PACKAGE',
  'GENERATE_PODCAST_PACKAGE',
  'GENERATE_MUSIC_CONCEPT',
  'GENERATE_GAME_CONCEPT_PACK',
  'GENERATE_TRAILER_PACKAGE'
);

CREATE TYPE "MediaCorpGenerationJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'RETRYABLE_FAILURE'
);

CREATE TYPE "MediaCorpReviewDecision" AS ENUM ('APPROVE', 'REJECT', 'REVISE');
CREATE TYPE "MediaCorpReleaseCandidateStatus" AS ENUM ('DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED');

CREATE TABLE "MediaPromptTemplate" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "medium" "MediaCorpFormat" NOT NULL,
  "purpose" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaPromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPromptRun" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "templateExternalId" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "generationJobExternalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaPromptRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaGenerationJob" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "seedExternalId" TEXT NOT NULL,
  "contentPlanExternalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "jobType" "MediaCorpGenerationJobType" NOT NULL,
  "status" "MediaCorpGenerationJobStatus" NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptTemplateExternalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaGenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaArtifactBundle" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "seedExternalId" TEXT NOT NULL,
  "contentPlanExternalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "medium" "MediaCorpFormat" NOT NULL,
  "status" "MediaCorpArtifactStatus" NOT NULL,
  "reviewStatus" TEXT NOT NULL,
  "qualityScore" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaArtifactBundle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaArtifact" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "seedExternalId" TEXT NOT NULL,
  "contentPlanExternalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "artifactType" "MediaCorpArtifactType" NOT NULL,
  "title" TEXT NOT NULL,
  "status" "MediaCorpArtifactStatus" NOT NULL,
  "reviewStatus" TEXT NOT NULL,
  "qualityScore" INTEGER NOT NULL,
  "rightsSimilarityRisk" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaArtifactVersion" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "artifactExternalId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaArtifactVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaArtifactReviewScorecard" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "overall" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaArtifactReviewScorecard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaReviewDecision" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "decision" "MediaCorpReviewDecision" NOT NULL,
  "reviewer" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaReleaseCandidate" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "franchiseExternalId" TEXT NOT NULL,
  "artifactBundleExternalId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" "MediaCorpReleaseCandidateStatus" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaReleaseCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaDistributionPackage" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "releaseCandidateExternalId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaDistributionPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaPromptTemplate_externalId_version_key" ON "MediaPromptTemplate"("externalId", "version");
CREATE UNIQUE INDEX "MediaPromptRun_externalId_key" ON "MediaPromptRun"("externalId");
CREATE UNIQUE INDEX "MediaGenerationJob_externalId_key" ON "MediaGenerationJob"("externalId");
CREATE UNIQUE INDEX "MediaArtifactBundle_externalId_key" ON "MediaArtifactBundle"("externalId");
CREATE UNIQUE INDEX "MediaArtifact_externalId_key" ON "MediaArtifact"("externalId");
CREATE UNIQUE INDEX "MediaArtifactVersion_externalId_key" ON "MediaArtifactVersion"("externalId");
CREATE UNIQUE INDEX "MediaArtifactReviewScorecard_externalId_key" ON "MediaArtifactReviewScorecard"("externalId");
CREATE UNIQUE INDEX "MediaReviewDecision_externalId_key" ON "MediaReviewDecision"("externalId");
CREATE UNIQUE INDEX "MediaReleaseCandidate_externalId_key" ON "MediaReleaseCandidate"("externalId");
CREATE UNIQUE INDEX "MediaDistributionPackage_externalId_key" ON "MediaDistributionPackage"("externalId");

CREATE INDEX "MediaPromptTemplate_medium_updatedAt_idx" ON "MediaPromptTemplate"("medium", "updatedAt");
CREATE INDEX "MediaPromptRun_franchiseExternalId_createdAt_idx" ON "MediaPromptRun"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaPromptRun_artifactBundleExternalId_createdAt_idx" ON "MediaPromptRun"("artifactBundleExternalId", "createdAt");
CREATE INDEX "MediaGenerationJob_franchiseExternalId_createdAt_idx" ON "MediaGenerationJob"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaGenerationJob_status_updatedAt_idx" ON "MediaGenerationJob"("status", "updatedAt");
CREATE INDEX "MediaArtifactBundle_franchiseExternalId_createdAt_idx" ON "MediaArtifactBundle"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaArtifactBundle_reviewStatus_updatedAt_idx" ON "MediaArtifactBundle"("reviewStatus", "updatedAt");
CREATE INDEX "MediaArtifact_franchiseExternalId_createdAt_idx" ON "MediaArtifact"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaArtifact_artifactBundleExternalId_updatedAt_idx" ON "MediaArtifact"("artifactBundleExternalId", "updatedAt");
CREATE INDEX "MediaArtifactVersion_artifactExternalId_version_idx" ON "MediaArtifactVersion"("artifactExternalId", "version");
CREATE INDEX "MediaArtifactReviewScorecard_franchiseExternalId_createdAt_idx" ON "MediaArtifactReviewScorecard"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaArtifactReviewScorecard_artifactBundleExternalId_createdAt_idx" ON "MediaArtifactReviewScorecard"("artifactBundleExternalId", "createdAt");
CREATE INDEX "MediaReviewDecision_franchiseExternalId_createdAt_idx" ON "MediaReviewDecision"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaReviewDecision_artifactBundleExternalId_createdAt_idx" ON "MediaReviewDecision"("artifactBundleExternalId", "createdAt");
CREATE INDEX "MediaReleaseCandidate_franchiseExternalId_createdAt_idx" ON "MediaReleaseCandidate"("franchiseExternalId", "createdAt");
CREATE INDEX "MediaReleaseCandidate_status_updatedAt_idx" ON "MediaReleaseCandidate"("status", "updatedAt");
CREATE INDEX "MediaDistributionPackage_releaseCandidateExternalId_createdAt_idx" ON "MediaDistributionPackage"("releaseCandidateExternalId", "createdAt");
