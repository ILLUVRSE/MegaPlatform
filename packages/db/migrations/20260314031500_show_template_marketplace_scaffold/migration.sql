-- Phase 79: internal Studio show template marketplace scaffold.
CREATE TABLE "ShowTemplate" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "templateType" "ShowProjectFormat" NOT NULL,
  "createdById" TEXT NOT NULL,
  "sourceShowProjectId" TEXT,
  "visibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE',
  "serializedDefaults" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShowTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShowTemplate_createdById_createdAt_idx"
ON "ShowTemplate"("createdById", "createdAt");

CREATE INDEX "ShowTemplate_templateType_visibility_createdAt_idx"
ON "ShowTemplate"("templateType", "visibility", "createdAt");

CREATE INDEX "ShowTemplate_sourceShowProjectId_createdAt_idx"
ON "ShowTemplate"("sourceShowProjectId", "createdAt");

ALTER TABLE "ShowTemplate"
ADD CONSTRAINT "ShowTemplate_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShowTemplate"
ADD CONSTRAINT "ShowTemplate_sourceShowProjectId_fkey"
FOREIGN KEY ("sourceShowProjectId") REFERENCES "ShowProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
