CREATE TYPE "InteractiveExtraType" AS ENUM ('POLL', 'CALLOUT');

CREATE TYPE "InteractiveExtraPublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "InteractiveExtra" (
  "id" TEXT NOT NULL,
  "showId" TEXT,
  "episodeId" TEXT,
  "type" "InteractiveExtraType" NOT NULL,
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "publishStatus" "InteractiveExtraPublishStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InteractiveExtra_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InteractiveExtra_target_check" CHECK (
    (CASE WHEN "showId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "episodeId" IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

CREATE INDEX "InteractiveExtra_showId_publishStatus_updatedAt_idx"
  ON "InteractiveExtra"("showId", "publishStatus", "updatedAt");

CREATE INDEX "InteractiveExtra_episodeId_publishStatus_updatedAt_idx"
  ON "InteractiveExtra"("episodeId", "publishStatus", "updatedAt");

ALTER TABLE "InteractiveExtra"
  ADD CONSTRAINT "InteractiveExtra_showId_fkey"
  FOREIGN KEY ("showId") REFERENCES "ShowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InteractiveExtra"
  ADD CONSTRAINT "InteractiveExtra_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "ShowEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
