ALTER TABLE "Episode"
ADD COLUMN "isPremiereEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "premiereStartsAt" TIMESTAMP(3),
ADD COLUMN "premiereEndsAt" TIMESTAMP(3),
ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ShowEpisode"
ADD COLUMN "isPremiereEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "premiereStartsAt" TIMESTAMP(3),
ADD COLUMN "premiereEndsAt" TIMESTAMP(3),
ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Episode_isPremiereEnabled_premiereStartsAt_idx"
ON "Episode"("isPremiereEnabled", "premiereStartsAt");

CREATE INDEX "ShowEpisode_showProjectId_status_isPremiereEnabled_premiereStartsAt_idx"
ON "ShowEpisode"("showProjectId", "status", "isPremiereEnabled", "premiereStartsAt");
