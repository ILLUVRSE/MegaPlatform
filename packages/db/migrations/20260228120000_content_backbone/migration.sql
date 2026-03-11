-- Content backbone: canonical content model + lifecycle audit
CREATE TYPE "ContentState" AS ENUM ('DRAFT', 'PROCESSING', 'REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "ContentAssetKind" AS ENUM ('VIDEO', 'THUMBNAIL', 'AUDIO');

CREATE TABLE "ContentItem" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "state" "ContentState" NOT NULL DEFAULT 'DRAFT',
  "creatorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentAsset" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "kind" "ContentAssetKind" NOT NULL,
  "storageKey" TEXT,
  "url" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentStateTransition" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "fromState" "ContentState" NOT NULL,
  "toState" "ContentState" NOT NULL,
  "actorId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentStateTransition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentItem_state_createdAt_idx" ON "ContentItem"("state", "createdAt");
CREATE INDEX "ContentItem_creatorId_createdAt_idx" ON "ContentItem"("creatorId", "createdAt");
CREATE INDEX "ContentAsset_contentId_createdAt_idx" ON "ContentAsset"("contentId", "createdAt");
CREATE INDEX "ContentStateTransition_contentId_createdAt_idx" ON "ContentStateTransition"("contentId", "createdAt");
CREATE INDEX "ContentStateTransition_actorId_createdAt_idx" ON "ContentStateTransition"("actorId", "createdAt");

ALTER TABLE "ContentItem"
  ADD CONSTRAINT "ContentItem_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentAsset"
  ADD CONSTRAINT "ContentAsset_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentStateTransition"
  ADD CONSTRAINT "ContentStateTransition_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentStateTransition"
  ADD CONSTRAINT "ContentStateTransition_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
