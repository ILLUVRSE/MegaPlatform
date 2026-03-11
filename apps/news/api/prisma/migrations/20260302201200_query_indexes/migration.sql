-- Query-path indexes for ranking, admin lists, and feed lookups
CREATE INDEX "Source_active_createdAt_idx" ON "Source"("active", "createdAt");
CREATE INDEX "Source_category_active_idx" ON "Source"("category", "active");

CREATE INDEX "Article_sourceId_publishedAt_idx" ON "Article"("sourceId", "publishedAt");
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");
CREATE INDEX "Article_contentHash_idx" ON "Article"("contentHash");
CREATE INDEX "Article_canonicalUrl_idx" ON "Article"("canonicalUrl");

CREATE INDEX "Cluster_globalScore_updatedAt_idx" ON "Cluster"("globalScore", "updatedAt");
CREATE INDEX "Cluster_verticalScore_updatedAt_idx" ON "Cluster"("verticalScore", "updatedAt");
CREATE INDEX "Cluster_localScore_updatedAt_idx" ON "Cluster"("localScore", "updatedAt");

CREATE INDEX "ClusterArticle_articleId_idx" ON "ClusterArticle"("articleId");
CREATE INDEX "Episode_showType_publishedAt_idx" ON "Episode"("showType", "publishedAt");
CREATE INDEX "UserInteraction_clusterId_createdAt_idx" ON "UserInteraction"("clusterId", "createdAt");

CREATE INDEX "PipelineLog_queue_createdAt_idx" ON "PipelineLog"("queue", "createdAt");
CREATE INDEX "PipelineLog_status_createdAt_idx" ON "PipelineLog"("status", "createdAt");
CREATE INDEX "TaskCard_status_createdAt_idx" ON "TaskCard"("status", "createdAt");
