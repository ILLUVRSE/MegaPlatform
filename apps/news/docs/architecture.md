# ILLUVRSE News Architecture Decisions

## 2026-03-02 Expansion: Autonomous Mana Sink Layer

1. Evaluation-first pipeline
- Added `evaluation_queue` and `EvaluationLog` so cluster/summarization/ranking quality is continuously measured.
- Worker emits low-score `TaskCard` entries to auto-generate remediation backlog.

2. Ranking now includes source reliability
- Added `SourceMetrics` and `source_reputation_queue` nightly updates.
- Ranking integrates source reputation score to penalize low-quality publishers.

3. Personalization as multiplier, not separate rank store
- Added `UserInteraction` and user `interestVector`.
- `GET /api/personalized` applies multiplier at read time for flexibility.

4. Podcast network supports mode registry
- Added `PodcastTemplate` and `PodcastVoice` registries.
- Script generation now mode-based (`solo`, `debate`, `analyst`, `rapid`) with sponsor/music placeholders.

5. Cost governance is explicit
- Added `TokenUsageLog`, per-stage budgets, and skip logic for high-cost stages.
- Cost spikes auto-create `TaskCard` issues for engineering follow-up.
- Admin cost endpoint now exposes both recent-window and lifetime totals with per-stage breakdowns.

6. Continuous backlog generation
- `TaskCard` model introduced.
- Evaluation failures, ranking drift, source drops, and token overages auto-populate backlog.

7. Semantic intelligence is pluggable
- Added cluster vectors (`storyVector`) with stub embeddings.
- Semantic search and related stories endpoints use vector similarity now, ready for provider swap later.
- Related story ranking now includes a freshness-weighted tie-breaker to reduce stale-but-similar recommendations.
- Keyword search now applies lexical + freshness + global-score reranking for better topical ordering.

8. Performance strategy
- Added in-memory cache for ranking queries.
- Cache now enforces a max entry budget with oldest-entry eviction.
- Rank updates proactively invalidate cached global/vertical/local pages to reduce stale reads.
- Added explicit database indexes aligned to high-frequency ranking, admin, and feed access patterns.
- Added pagination to list endpoints and a performance-focused test suite.

9. Readiness-focused health checks
- `/api/health` now validates database and queue connectivity when configured.
- Endpoint returns subsystem states plus aggregated queue backlog totals, enabling alerting on degraded readiness.

10. Admin API authorization hardening
- Added server-side token enforcement for `/api/admin/*` and analytics admin ingress routes.
- Web admin pages now forward auth token when fetching backend admin endpoints.

11. External I/O retry discipline
- Added reusable exponential backoff helper.
- RSS ingest fetches and audio storage uploads now retry on transient failures before failing worker jobs.

12. Analytics input correctness guardrails
- Podcast completion endpoint now validates payloads and bounds completion percentages to `[0,100]`.

13. Search abuse protection
- Added in-process per-IP rate limiting for search routes to bound query burst costs and protect API capacity.

14. Dead-letter pipeline visibility
- Worker failures now enqueue structured payloads to `dead_letter_queue` for postmortem and replay workflows.

15. API validation rigor
- Admin and podcast routes now use explicit safe-parse paths and return deterministic 400s for invalid payloads/enum values.

16. Runtime observability surface
- Added `/api/metrics` endpoint with process memory + uptime and ranking cache effectiveness counters (hits/misses/hit-rate/evictions).

17. Bootstrap idempotency
- Worker boot-time background jobs now use deterministic job IDs to reduce duplicate nightly work across process restarts.

18. Dedup query bounding
- Dedup worker now searches a bounded, recent cluster window with a single sampled article per candidate, reducing scan amplification.

19. Failure triage ergonomics
- Added admin endpoint to inspect `dead_letter_queue` payloads with pagination for faster failure diagnosis.

20. Semantic search caching
- Added bounded short-TTL cache for semantic query results to reduce repeated vector scoring overhead.
