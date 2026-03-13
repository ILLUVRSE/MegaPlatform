-- CreateTable
CREATE TABLE "ShowScene" (
    "id" TEXT NOT NULL,
    "showEpisodeId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scriptText" TEXT NOT NULL,
    "startIntentSeconds" INTEGER,
    "endIntentSeconds" INTEGER,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowScene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShowScene_showEpisodeId_sceneNumber_key" ON "ShowScene"("showEpisodeId", "sceneNumber");

-- CreateIndex
CREATE INDEX "ShowScene_showEpisodeId_createdAt_idx" ON "ShowScene"("showEpisodeId", "createdAt");

-- CreateIndex
CREATE INDEX "ShowScene_showEpisodeId_updatedAt_idx" ON "ShowScene"("showEpisodeId", "updatedAt");

-- AddForeignKey
ALTER TABLE "ShowScene" ADD CONSTRAINT "ShowScene_showEpisodeId_fkey" FOREIGN KEY ("showEpisodeId") REFERENCES "ShowEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
