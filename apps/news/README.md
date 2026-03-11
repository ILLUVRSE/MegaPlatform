# ILLUVRSE News

Production-oriented news + podcast platform with autonomous evaluation loops, personalization, experimentation, and self-generated engineering tasks.

## Stack

- Frontend: Next.js (App Router), TypeScript, TailwindCSS
- API: Fastify, TypeScript, Prisma, Postgres
- Workers: BullMQ + Redis
- Search: semantic vector stub + keyword search (Meilisearch service is included for future externalized indexing)
- Audio storage: S3-compatible endpoint interface (stubbed uploader)
- Tests: Vitest + Supertest + XML feed validation + performance tests

## Structure

- `api/`: Fastify API and Prisma schema
- `workers/`: BullMQ workers for ingestion, clustering, evaluation, ranking, reputation, personalization, experiments, podcast, RSS, weekly digests
- `lib/`: Shared canonicalization, clustering, ranking, evaluation, personalization, reputation, experiments, costs, semantic search, vertical intelligence
- `web/`: Next.js frontend app
- `tests/`: Unit, integration, performance tests
- `docs/architecture.md`: key architecture decisions

## Phase Expansion Summary

### Phase 1: Autonomous Evaluation Layer
- Added `/lib/evaluation`
- Added `EvaluationLog`
- Added `evaluation_queue`
- Cluster, summary, and ranking drift evaluations now run continuously

### Phase 2: Source Reputation System
- Added `SourceMetrics`
- Added `source_reputation_queue` nightly scoring
- Ranking now consumes source reliability

### Phase 3: Personalization Engine
- Added `UserInteraction` and `interestVector`
- Added `personalization_queue`
- Added `GET /api/personalized`

### Phase 4: Multi-Voice Podcast Network
- Added `PodcastTemplate` and `PodcastVoice` registries
- Added mode-aware scripts (solo/debate/analyst/rapid)
- TTS now consumes segment + speaker metadata

### Phase 5: Analytics Engine
- Added `AnalyticsEvent`
- Tracks cluster views, podcast plays/completions, RSS downloads
- Podcast completion analytics now validates payload shape and clamps completion to 0-100
- Admin dashboard endpoint exposes DAU/top clusters/top episodes/engagement

### Phase 6: Experimentation Framework
- Added `Experiment` and `ExperimentAssignment`
- Added assignment utility and experiment evaluation queue

### Phase 7: Cost Governance
- Added `TokenUsageLog`
- Added stage token budgets + cost estimates + skip gates
- Added admin cost endpoint with window + lifetime totals and stage-level breakdowns

### Phase 8: Self-Generating Task System
- Added `TaskCard`
- Workers auto-create tasks from evaluation failures, drift alerts, reliability drops, and cost spikes
- Added `/api/admin/tasks`

### Phase 9: Search + Vector Intelligence
- Added semantic search endpoint `/api/search/semantic`
- Added short-TTL semantic query cache for repeated lookups
- Added related stories endpoint `/api/clusters/:id/related`
- Related story ranking now blends vector similarity with freshness weighting
- Keyword search now uses lexical relevance + freshness + global-score reranking instead of pure recency ordering

### Phase 10: ILLUVRSE Vertical Intelligence
- Added `/lib/vertical-intelligence`
- Gaming clusters emit builder takeaway, monetization impact, and platform implications

### Phase 11: Automated Weekly Reports
- Added `weekly_digest_queue`
- Generates weekly global/vertical/local report payloads (podcast + markdown + html pipeline outputs)

### Phase 12: Performance Hardening
- Added ranking cache layer
- Added bounded cache eviction to prevent unbounded process memory growth
- Added cache invalidation hooks after rank updates to reduce stale leaderboard reads
- Added pagination to listing endpoints
- Added defensive pagination parsing (invalid query values now safely default instead of bubbling into DB errors)
- Added explicit DB indexes for ranking, source/article retrieval, admin logs/tasks, and show feed lookups
- Added `Cluster(updatedAt)` index and bounded dedup candidate scans for lower clustering query load
- Added ranking performance test suite

### Phase 13: Pipeline Reliability Hardening
- Added exponential retry/backoff utility for transient external failures
- Ingestion RSS pulls and TTS audio uploads now retry before failing jobs
- Added search endpoint rate limiting (`SEARCH_RATE_LIMIT_PER_MINUTE`) to control abuse and cost spikes
- Worker failures now emit structured dead-letter jobs into `dead_letter_queue` for triage
- Admin/podcast endpoints now return explicit 400s for invalid payloads and enum filters (no silent 500s)
- Worker startup background jobs now use stable dedupe job IDs to avoid duplicate nightly runs after restarts

## Quick start

1. Copy env: `cp .env.example .env`
2. Start infra and apps: `docker compose up --build`
3. In another shell, run migrations/seed:
   - `npm install`
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
   - `npm run prisma:seed`
4. API health: `http://localhost:4000/api/health`
   - Metrics: `http://localhost:4000/api/metrics`
5. Frontend: `http://localhost:3000`

Health payload now includes dependency readiness (`database`, `queues`) and aggregated queue backlog counts for operational monitoring.
Metrics payload now includes process memory/uptime and ranking cache hit/miss counters.

## Pipeline queues

- `ingest_queue`
- `canonicalize_queue`
- `dedup_cluster_queue`
- `summarize_cluster_queue`
- `evaluation_queue`
- `rank_queue`
- `source_reputation_queue`
- `personalization_queue`
- `experiment_evaluation_queue`
- `podcast_script_queue`
- `tts_queue`
- `rss_publish_queue`
- `weekly_digest_queue`
- `dead_letter_queue`

## Key API endpoints

- `GET /api/clusters?type=global|vertical|local&limit=&offset=`
- `GET /api/clusters/:id`
- `GET /api/clusters/:id/related`
- `GET /api/search?q=`
- `GET /api/search/semantic?q=`
- `GET /api/personalized?userId=`
- `GET /api/podcast/:showType`
- `GET /api/rss/global.xml`
- `GET /api/rss/vertical.xml`
- `GET /api/rss/local.xml`

## Admin (Forge)

- UI: `/admin?token=$ADMIN_TOKEN`
- Task/Cost UI: `/admin/tasks?token=$ADMIN_TOKEN`
- API:
  - All admin API calls require `x-admin-token: $ADMIN_TOKEN` header (or `?token=$ADMIN_TOKEN` for server-side requests)
  - `POST /api/admin/source`
  - `POST /api/admin/reingest`
  - `POST /api/admin/recluster`
  - `POST /api/admin/resummarize`
  - `POST /api/admin/generate-podcast/:showType`
  - `POST /api/admin/nightly/source-reputation`
  - `POST /api/admin/nightly/personalization`
  - `POST /api/admin/experiments/evaluate`
  - `POST /api/admin/weekly-digest`
  - `GET /api/admin/dashboard`
  - `GET /api/admin/costs`
  - `GET /api/admin/tasks`
  - `GET /api/admin/dead-letters`

## Notes

- TTS, vector embeddings, and search are provider-agnostic scaffolds and can be swapped with production services.
- Evaluation loops, task cards, and token governance are designed to continuously generate measurable engineering backlog.
