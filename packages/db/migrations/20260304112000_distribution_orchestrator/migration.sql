-- Phase 69: distribution action orchestration.

CREATE TYPE "DistributionActionStatus" AS ENUM ('SCHEDULED', 'EXECUTED', 'SKIPPED', 'FAILED');

CREATE TABLE "DistributionAction" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "status" "DistributionActionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DistributionAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DistributionAction_status_scheduledFor_idx" ON "DistributionAction"("status", "scheduledFor");
CREATE INDEX "DistributionAction_module_createdAt_idx" ON "DistributionAction"("module", "createdAt");
