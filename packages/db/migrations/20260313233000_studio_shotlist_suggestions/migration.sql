-- CreateTable
CREATE TABLE "ShotlistSuggestion" (
    "id" TEXT NOT NULL,
    "showEpisodeId" TEXT NOT NULL,
    "showSceneId" TEXT,
    "shotNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "framing" TEXT NOT NULL,
    "cameraMotion" TEXT NOT NULL,
    "lens" TEXT,
    "durationSeconds" INTEGER NOT NULL,
    "rationale" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShotlistSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShotlistSuggestion_showEpisodeId_showSceneId_shotNumber_key" ON "ShotlistSuggestion"("showEpisodeId", "showSceneId", "shotNumber");

-- CreateIndex
CREATE INDEX "ShotlistSuggestion_showEpisodeId_createdAt_idx" ON "ShotlistSuggestion"("showEpisodeId", "createdAt");

-- CreateIndex
CREATE INDEX "ShotlistSuggestion_showSceneId_shotNumber_idx" ON "ShotlistSuggestion"("showSceneId", "shotNumber");

-- AddForeignKey
ALTER TABLE "ShotlistSuggestion" ADD CONSTRAINT "ShotlistSuggestion_showEpisodeId_fkey" FOREIGN KEY ("showEpisodeId") REFERENCES "ShowEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotlistSuggestion" ADD CONSTRAINT "ShotlistSuggestion_showSceneId_fkey" FOREIGN KEY ("showSceneId") REFERENCES "ShowScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
