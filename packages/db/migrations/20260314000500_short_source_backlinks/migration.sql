ALTER TABLE "DerivedShortDraft"
  ADD COLUMN "sourceShowId" TEXT,
  ADD COLUMN "sourceEpisodeId" TEXT,
  ADD COLUMN "sourceSceneId" TEXT,
  ADD COLUMN "sourceTimestampSeconds" INTEGER;

UPDATE "DerivedShortDraft" AS draft
SET
  "sourceShowId" = episode."showProjectId",
  "sourceEpisodeId" = draft."showEpisodeId",
  "sourceSceneId" = draft."showSceneId",
  "sourceTimestampSeconds" = scene."startIntentSeconds"
FROM "ShowEpisode" AS episode,
     "ShowScene" AS scene
WHERE episode."id" = draft."showEpisodeId"
  AND scene."id" = draft."showSceneId";

ALTER TABLE "DerivedShortDraft"
  ALTER COLUMN "sourceShowId" SET NOT NULL,
  ALTER COLUMN "sourceEpisodeId" SET NOT NULL;

CREATE INDEX "DerivedShortDraft_sourceEpisodeId_idx" ON "DerivedShortDraft"("sourceEpisodeId");

ALTER TABLE "ShortPost"
  ADD COLUMN "sourceShowId" TEXT,
  ADD COLUMN "sourceEpisodeId" TEXT,
  ADD COLUMN "sourceSceneId" TEXT,
  ADD COLUMN "sourceTimestampSeconds" INTEGER;

CREATE INDEX "ShortPost_sourceShowId_idx" ON "ShortPost"("sourceShowId");
CREATE INDEX "ShortPost_sourceEpisodeId_idx" ON "ShortPost"("sourceEpisodeId");
