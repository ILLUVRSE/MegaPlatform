-- CreateEnum
CREATE TYPE "ShowEpisodeStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ShowEpisodeTemplateType" AS ENUM ('STANDARD_EPISODE', 'COLD_OPEN_EPISODE', 'MOVIE_CHAPTER');

-- CreateTable
CREATE TABLE "ShowEpisode" (
    "id" TEXT NOT NULL,
    "showProjectId" TEXT NOT NULL,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "synopsis" TEXT,
    "runtimeSeconds" INTEGER,
    "status" "ShowEpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "templateType" "ShowEpisodeTemplateType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShowEpisode_showProjectId_slug_key" ON "ShowEpisode"("showProjectId", "slug");

-- CreateIndex
CREATE INDEX "ShowEpisode_showProjectId_createdAt_idx" ON "ShowEpisode"("showProjectId", "createdAt");

-- CreateIndex
CREATE INDEX "ShowEpisode_showProjectId_status_updatedAt_idx" ON "ShowEpisode"("showProjectId", "status", "updatedAt");

-- AddForeignKey
ALTER TABLE "ShowEpisode" ADD CONSTRAINT "ShowEpisode_showProjectId_fkey" FOREIGN KEY ("showProjectId") REFERENCES "ShowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
