-- DropIndex
DROP INDEX "SchedulerRun_startedAt_idx";

-- AlterTable
ALTER TABLE "StudioAsset" ALTER COLUMN "updatedAt" DROP DEFAULT;
