-- Phase 64: publish-time content QA results for auditable gating.

CREATE TYPE "ContentQaStatus" AS ENUM ('PASS', 'FAIL');

CREATE TABLE "ContentQaResult" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "status" "ContentQaStatus" NOT NULL,
  "technicalScore" INTEGER NOT NULL,
  "policyScore" INTEGER NOT NULL,
  "issuesJson" JSONB,
  "checkedBy" TEXT NOT NULL DEFAULT 'qa-agent-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentQaResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentQaResult_projectId_createdAt_idx" ON "ContentQaResult"("projectId", "createdAt");

ALTER TABLE "ContentQaResult"
  ADD CONSTRAINT "ContentQaResult_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
