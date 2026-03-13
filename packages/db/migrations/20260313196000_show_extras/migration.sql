CREATE TYPE "ShowExtraType" AS ENUM (
  'BEHIND_THE_SCENES',
  'COMMENTARY',
  'BONUS_CLIP',
  'TRAILER'
);

CREATE TYPE "ShowExtraStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED'
);

CREATE TABLE "ShowExtra" (
  "id" TEXT NOT NULL,
  "showProjectId" TEXT NOT NULL,
  "type" "ShowExtraType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assetUrl" TEXT NOT NULL,
  "runtimeSeconds" INTEGER,
  "status" "ShowExtraStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "premiereType" "PremiereType" NOT NULL DEFAULT 'IMMEDIATE',
  "releaseAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShowExtra_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShowExtra_showProjectId_createdAt_idx" ON "ShowExtra"("showProjectId", "createdAt");
CREATE INDEX "ShowExtra_showProjectId_status_updatedAt_idx" ON "ShowExtra"("showProjectId", "status", "updatedAt");
CREATE INDEX "ShowExtra_showProjectId_status_premiereType_releaseAt_idx" ON "ShowExtra"("showProjectId", "status", "premiereType", "releaseAt");

ALTER TABLE "ShowExtra"
ADD CONSTRAINT "ShowExtra_showProjectId_fkey"
FOREIGN KEY ("showProjectId") REFERENCES "ShowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
