-- CreateTable
CREATE TABLE "DerivedShortDraft" (
    "id" TEXT NOT NULL,
    "showEpisodeId" TEXT NOT NULL,
    "showSceneId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clipStartSeconds" INTEGER NOT NULL,
    "clipEndSeconds" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DerivedShortDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DerivedShortDraft_showEpisodeId_showSceneId_key" ON "DerivedShortDraft"("showEpisodeId", "showSceneId");

-- CreateIndex
CREATE INDEX "DerivedShortDraft_showEpisodeId_createdAt_idx" ON "DerivedShortDraft"("showEpisodeId", "createdAt");

-- CreateIndex
CREATE INDEX "DerivedShortDraft_showSceneId_idx" ON "DerivedShortDraft"("showSceneId");

-- AddForeignKey
ALTER TABLE "DerivedShortDraft" ADD CONSTRAINT "DerivedShortDraft_showEpisodeId_fkey" FOREIGN KEY ("showEpisodeId") REFERENCES "ShowEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerivedShortDraft" ADD CONSTRAINT "DerivedShortDraft_showSceneId_fkey" FOREIGN KEY ("showSceneId") REFERENCES "ShowScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
