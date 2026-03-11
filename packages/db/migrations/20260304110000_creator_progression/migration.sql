-- Phase 67: creator progression and rewards state.

CREATE TABLE "CreatorProgression" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "tier" TEXT NOT NULL DEFAULT 'RISING',
  "rewardsEarned" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorProgression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorProgressEvent" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorProgressEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorProgression_creatorProfileId_key" ON "CreatorProgression"("creatorProfileId");
CREATE INDEX "CreatorProgressEvent_creatorProfileId_createdAt_idx" ON "CreatorProgressEvent"("creatorProfileId", "createdAt");

ALTER TABLE "CreatorProgression"
  ADD CONSTRAINT "CreatorProgression_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorProgressEvent"
  ADD CONSTRAINT "CreatorProgressEvent_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
