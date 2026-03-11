-- Phase 66: creator revenue attribution records.

CREATE TABLE "RevenueAttribution" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "shortPostId" TEXT,
  "projectId" TEXT,
  "actionType" TEXT NOT NULL,
  "eventSource" TEXT NOT NULL,
  "revenueCents" INTEGER NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadataJson" JSONB,
  CONSTRAINT "RevenueAttribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevenueAttribution_creatorProfileId_occurredAt_idx" ON "RevenueAttribution"("creatorProfileId", "occurredAt");
CREATE INDEX "RevenueAttribution_actionType_occurredAt_idx" ON "RevenueAttribution"("actionType", "occurredAt");

ALTER TABLE "RevenueAttribution"
  ADD CONSTRAINT "RevenueAttribution_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
