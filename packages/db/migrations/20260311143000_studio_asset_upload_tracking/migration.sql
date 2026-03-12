-- Studio asset upload tracking: signed uploads, finalize state, cost and TTL metadata
ALTER TABLE "StudioAsset"
ADD COLUMN "uploadId" TEXT,
ADD COLUMN "jobId" TEXT,
ADD COLUMN "s3Key" TEXT,
ADD COLUMN "checksum" TEXT,
ADD COLUMN "size" INTEGER,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "costEstimate" DECIMAL(12,6),
ADD COLUMN "ttlAt" TIMESTAMP(3),
ADD COLUMN "finalizedAt" TIMESTAMP(3);

-- Preserve legacy assets by synthesizing stable upload ids and mirroring storage metadata.
UPDATE "StudioAsset"
SET
  "uploadId" = COALESCE("uploadId", 'legacy-' || "id"),
  "s3Key" = COALESCE("s3Key", "storageKey"),
  "size" = COALESCE("size", "sizeBytes"),
  "status" = CASE
    WHEN COALESCE("isQuarantined", false) = true OR COALESCE("isFlagged", false) = true THEN 'failed'
    WHEN COALESCE("temporary", false) = true THEN 'writing'
    ELSE COALESCE(NULLIF("status", ''), 'complete')
  END,
  "finalizedAt" = COALESCE("finalizedAt", CASE WHEN COALESCE("temporary", false) = true THEN NULL ELSE "createdAt" END);

ALTER TABLE "StudioAsset"
ALTER COLUMN "uploadId" SET NOT NULL;

CREATE UNIQUE INDEX "StudioAsset_uploadId_key" ON "StudioAsset"("uploadId");
CREATE INDEX "StudioAsset_projectId_status_idx" ON "StudioAsset"("projectId", "status");
