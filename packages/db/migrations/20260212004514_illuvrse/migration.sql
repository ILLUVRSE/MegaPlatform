-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
-- MIGRATION_ALLOW_DESTRUCTIVE: legacy FK constraint recreation to make PlaylistItem.episodeId nullable.


ALTER TYPE "AgentJobType" ADD VALUE 'VIDEO_CLIP_EXTRACT';
ALTER TYPE "AgentJobType" ADD VALUE 'VIDEO_TRANSCODE';
ALTER TYPE "AgentJobType" ADD VALUE 'THUMBNAIL_GENERATE';

-- AlterEnum
ALTER TYPE "StudioAssetKind" ADD VALUE 'HLS_MANIFEST';

-- DropForeignKey
ALTER TABLE "PlaylistItem" DROP CONSTRAINT "PlaylistItem_episodeId_fkey";

-- AlterTable
ALTER TABLE "PlaylistItem" ALTER COLUMN "episodeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShortPost" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" INTEGER;

-- AddForeignKey
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
