-- AlterTable
ALTER TABLE "StudioAsset"
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "contentType" TEXT,
ADD COLUMN "sizeBytes" INTEGER,
ADD COLUMN "temporary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isSafe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill temporary from metaJson when available
UPDATE "StudioAsset"
SET "temporary" = true
WHERE COALESCE(("metaJson"->>'temporary')::boolean, false) = true;

-- CreateIndex
CREATE INDEX "StudioAsset_kind_createdAt_idx" ON "StudioAsset"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "StudioAsset_temporary_createdAt_idx" ON "StudioAsset"("temporary", "createdAt");
