-- Phase 68: auto-remix job pipeline with gating states.

CREATE TYPE "RemixJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'BLOCKED');

CREATE TABLE "RemixJob" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceAssetId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "status" "RemixJobStatus" NOT NULL DEFAULT 'QUEUED',
  "blockedReason" TEXT,
  "prompt" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RemixJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RemixJob_projectId_createdAt_idx" ON "RemixJob"("projectId", "createdAt");
CREATE INDEX "RemixJob_status_createdAt_idx" ON "RemixJob"("status", "createdAt");

ALTER TABLE "RemixJob"
  ADD CONSTRAINT "RemixJob_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
