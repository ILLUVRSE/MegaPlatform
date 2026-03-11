CREATE UNIQUE INDEX IF NOT EXISTS "ShortPost_projectId_key" ON "ShortPost"("projectId");
CREATE INDEX IF NOT EXISTS "ShortPost_createdById_publishedAt_idx" ON "ShortPost"("createdById", "publishedAt");
CREATE INDEX IF NOT EXISTS "ShortPost_mediaType_publishedAt_idx" ON "ShortPost"("mediaType", "publishedAt");

CREATE INDEX IF NOT EXISTS "FeedReport_postId_resolvedAt_idx" ON "FeedReport"("postId", "resolvedAt");
CREATE INDEX IF NOT EXISTS "FeedReport_reporterId_createdAt_idx" ON "FeedReport"("reporterId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedReport_resolvedAt_createdAt_idx" ON "FeedReport"("resolvedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Participant_partyId_joinedAt_idx" ON "Participant"("partyId", "joinedAt");
CREATE INDEX IF NOT EXISTS "Participant_userId_joinedAt_idx" ON "Participant"("userId", "joinedAt");

CREATE INDEX IF NOT EXISTS "AdminAudit_adminId_createdAt_idx" ON "AdminAudit"("adminId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAudit_action_createdAt_idx" ON "AdminAudit"("action", "createdAt");

ALTER TABLE "ShortPost"
  ADD CONSTRAINT "ShortPost_premium_price_check"
  CHECK (
    ("isPremium" = FALSE AND ("price" IS NULL OR "price" >= 0))
    OR ("isPremium" = TRUE AND "price" IS NOT NULL AND "price" > 0)
  );

ALTER TABLE "FeedReport"
  ADD CONSTRAINT "FeedReport_reporter_presence_check"
  CHECK ("reporterId" IS NOT NULL OR "anonId" IS NOT NULL);

ALTER TABLE "AdminAudit"
  ADD CONSTRAINT "AdminAudit_action_not_blank_check"
  CHECK (length(btrim("action")) > 0);
