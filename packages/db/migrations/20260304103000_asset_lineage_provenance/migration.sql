-- Phase 63: asset lineage + provenance metadata.

CREATE TYPE "AssetOriginType" AS ENUM ('UPLOAD', 'GENERATED', 'REMIX', 'TEMPLATE', 'IMPORTED');
CREATE TYPE "AssetRightsStatus" AS ENUM ('UNVERIFIED', 'LICENSED', 'OWNED', 'RESTRICTED');

CREATE TABLE "AssetLineage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "studioAssetId" TEXT NOT NULL,
  "rootAssetId" TEXT,
  "parentAssetId" TEXT,
  "originType" "AssetOriginType" NOT NULL,
  "rightsStatus" "AssetRightsStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "provenanceJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetLineage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetLineage_studioAssetId_key" ON "AssetLineage"("studioAssetId");
CREATE INDEX "AssetLineage_projectId_createdAt_idx" ON "AssetLineage"("projectId", "createdAt");

ALTER TABLE "AssetLineage"
  ADD CONSTRAINT "AssetLineage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetLineage"
  ADD CONSTRAINT "AssetLineage_studioAssetId_fkey"
  FOREIGN KEY ("studioAssetId") REFERENCES "StudioAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
