CREATE TYPE "PremiereType" AS ENUM ('IMMEDIATE', 'SCHEDULED');

ALTER TABLE "Show"
ADD COLUMN "premiereType" "PremiereType" NOT NULL DEFAULT 'IMMEDIATE',
ADD COLUMN "releaseAt" TIMESTAMP(3);

ALTER TABLE "Episode"
ADD COLUMN "premiereType" "PremiereType" NOT NULL DEFAULT 'IMMEDIATE',
ADD COLUMN "releaseAt" TIMESTAMP(3);

ALTER TABLE "ShowProject"
ADD COLUMN "premiereType" "PremiereType" NOT NULL DEFAULT 'IMMEDIATE',
ADD COLUMN "releaseAt" TIMESTAMP(3);

ALTER TABLE "ShowEpisode"
ADD COLUMN "premiereType" "PremiereType" NOT NULL DEFAULT 'IMMEDIATE',
ADD COLUMN "releaseAt" TIMESTAMP(3);

CREATE INDEX "Show_premiereType_releaseAt_idx" ON "Show"("premiereType", "releaseAt");
CREATE INDEX "Episode_premiereType_releaseAt_idx" ON "Episode"("premiereType", "releaseAt");
CREATE INDEX "ShowProject_status_premiereType_releaseAt_idx" ON "ShowProject"("status", "premiereType", "releaseAt");
CREATE INDEX "ShowEpisode_showProjectId_status_premiereType_releaseAt_idx" ON "ShowEpisode"("showProjectId", "status", "premiereType", "releaseAt");
