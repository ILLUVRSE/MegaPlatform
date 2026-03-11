-- AlterTable
ALTER TABLE "LiveChannel"
ADD COLUMN "scheduleLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN "lastHealthyAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT;

-- CreateTable
CREATE TABLE "SchedulerRun" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'LIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "programsCreated" INTEGER NOT NULL DEFAULT 0,
  "channelsTouched" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT,
  "triggeredById" TEXT,
  CONSTRAINT "SchedulerRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulerRun_startedAt_idx" ON "SchedulerRun"("startedAt");
