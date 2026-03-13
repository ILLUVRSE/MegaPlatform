ALTER TABLE "ShowProject"
ADD COLUMN "publishedAt" TIMESTAMP(3);

ALTER TABLE "ShowEpisode"
ADD COLUMN "publishedAt" TIMESTAMP(3);

ALTER TABLE "Show"
ADD COLUMN "sourceShowProjectId" TEXT;

ALTER TABLE "Episode"
ADD COLUMN "sourceShowEpisodeId" TEXT;

CREATE INDEX "ShowProject_status_publishedAt_idx" ON "ShowProject"("status", "publishedAt");
CREATE INDEX "ShowEpisode_showProjectId_status_publishedAt_idx" ON "ShowEpisode"("showProjectId", "status", "publishedAt");

CREATE UNIQUE INDEX "Show_sourceShowProjectId_key" ON "Show"("sourceShowProjectId");
CREATE UNIQUE INDEX "Episode_sourceShowEpisodeId_key" ON "Episode"("sourceShowEpisodeId");
