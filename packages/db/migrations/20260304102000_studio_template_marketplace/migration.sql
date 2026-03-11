-- Phase 62: studio template marketplace models for publish/version/reuse.

CREATE TYPE "StudioTemplateKind" AS ENUM ('SHORT', 'MEME', 'GAME');

CREATE TABLE "StudioTemplate" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "kind" "StudioTemplateKind" NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "latestVersion" INTEGER NOT NULL DEFAULT 1,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioTemplateVersion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "schemaJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioTemplate_creatorProfileId_createdAt_idx" ON "StudioTemplate"("creatorProfileId", "createdAt");
CREATE INDEX "StudioTemplate_kind_isPublished_createdAt_idx" ON "StudioTemplate"("kind", "isPublished", "createdAt");
CREATE UNIQUE INDEX "StudioTemplateVersion_templateId_version_key" ON "StudioTemplateVersion"("templateId", "version");
CREATE INDEX "StudioTemplateVersion_templateId_createdAt_idx" ON "StudioTemplateVersion"("templateId", "createdAt");

ALTER TABLE "StudioTemplate"
  ADD CONSTRAINT "StudioTemplate_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioTemplateVersion"
  ADD CONSTRAINT "StudioTemplateVersion_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "StudioTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
