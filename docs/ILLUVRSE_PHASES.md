# ILLUVRSE MegaPlatform Phases

Use this file as the canonical reference when asking Codex CLI to execute a phase.

Status note:
- This file is a phase map and execution ledger input, not a claim that every listed phase is production-complete across the repo.
- "Implemented baseline" in this document should be read as a bounded repo slice, doc, evaluator, or admin/API surface unless stronger runtime evidence exists elsewhere.

## How to reference phases in prompts

Examples:

- `implement phase 1`
- `implement phase 6`
- `continue phase 8`
- `phase 12 review`

Codex should map phase numbers directly to the phase definitions below.

## Phase List

1. Repository stabilization and truth-alignment
2. Core platform hardening (auth, RBAC, security, config)
3. Data model finalization and migration safety
4. Media/storage productionization (S3/CDN/signing/lifecycle)
5. Watch platform completion (profiles, progress, entitlements, live reliability)
6. Party Core production upgrade (sync, presence, host controls, LiveKit real integration)
7. Studio pipeline production upgrade (queue reliability, render quality, retries, observability)
8. Shorts system completion (ingestion, ranking, moderation, monetization)
9. Games ecosystem completion (catalog, embeds, creator publishing, telemetry)
10. External app unification (News/GameGrid/PixelBrawl/Art Atlas standards and UX consistency)
11. Home/feed intelligence and trust-safety automation
12. Admin and Ops command center completion
13. Autonomy layer v2 (Director/Specialists with safe closed-loop execution)
14. Quality engineering and release gates (unit/integration/e2e/perf + flaky test controls)
15. Platform observability, SLOs, and incident runbooks
16. Deployment architecture and environment promotion (dev/stage/prod)
17. Growth, personalization, and recommendation intelligence
18. Financial ops and governance (cost controls, budgets, token/media spend guardrails)
19. Compliance and legal readiness (privacy, retention, content policy, auditability)
20. Launch readiness and post-launch optimization cadence

## Phase 1 Definition (implemented baseline)

Phase 1 objective: make the repository truthful, navigable, and stable enough to serve as a reliable base for phased execution.

Baseline deliverables:

- Root documentation reflects the real monorepo platform state.
- A canonical in-repo phase map exists for phase-based execution prompts.
- Baseline quality check path (`shipcheck:quick`) is unblocked from known config-level failures.

## Phase 2 Definition (implemented baseline)

Phase 2 objective: harden core platform authentication, authorization, security behavior, and runtime config safety.

Baseline deliverables:

- Auth configuration now validates production security requirements (`NEXTAUTH_URL`, strong `NEXTAUTH_SECRET`).
- Dev credentials auth is explicitly gated in production (`ALLOW_DEV_CREDENTIALS_AUTH`).
- RBAC checks are unified so all admin guards use the same principal-based authorization path.
- Disabled users are denied through principal resolution and session token refresh behavior.
- Middleware enforces permission-aware admin access and applies secure response headers on protected surfaces.
- In-memory rate limiting now bounds key growth to prevent unbounded memory use.

## Phase 3 Definition (implemented baseline)

Phase 3 objective: finalize data model governance and raise migration safety guarantees before further feature expansion.

Baseline deliverables:

- Migration linting enforces naming/structure/ordering integrity under `packages/db/migrations`.
- Destructive SQL is blocked by default unless explicitly justified in-migration.
- Shipcheck now includes DB safety checks (`db:migrations:lint` + Prisma schema validation).
- DB package now includes deploy-safe migration command (`prisma:migrate:deploy`) for non-dev environments.
- Migration workflow documentation is updated with enforceable policy and override rules.

## Phase 4 Definition (implemented baseline)

Phase 4 objective: productionize media/storage upload and lifecycle handling with safer signing and deletion semantics.

Baseline deliverables:

- Storage package supports controlled signed URL TTL, configurable region/path-style, and production HTTPS guardrails.
- Signed upload API sanitizes project path segments and returns signed metadata (`signedAt`, `expiresInSec`).
- Upload finalization enforces project namespace ownership for object keys and handles duplicate finalize calls idempotently.
- Temporary asset cleanup supports storage-backed object deletion (not only DB row deletion), with controllable failure behavior.
- Studio docs and env templates now include storage TTL/lifecycle settings used by the upload pipeline.

## Phase 5 Definition (implemented baseline)

Phase 5 objective: complete watch-platform baseline for profile-aware playback, entitlement checks, progress integrity, and live reliability metadata.

Baseline deliverables:

- Watch entitlement policy enforces premium sign-in requirement and kids-profile maturity restrictions.
- Episode/show watch APIs now return access decisions and hide playback URLs when access is denied.
- Watch progress writes validate episode existence, normalize position/duration, and clear near-complete entries.
- Live channel API now surfaces health metadata; live playback UI surfaces degraded-state warnings.
- Watch platform docs now reflect entitlement/profile restrictions and updated remaining TODOs.

## Phase 6 Definition (implemented baseline)

Phase 6 objective: harden Party Core for production by enforcing server-side host controls, improving presence reliability, and introducing LiveKit tokenized voice flow.

Baseline deliverables:

- Party playlist append is now host-only and server-authenticated (no public mutation path).
- Host control mutations (playback/lock/playlist) no longer depend on client-provided `hostId`.
- Participant heartbeat endpoint (`/api/party/[code]/presence/ping`) updates party presence state with `lastSeenAt`.
- Party SSE stream now emits keepalive heartbeat events to improve long-lived connection stability.
- Voice flow includes server-issued LiveKit token endpoint (`/api/party/[code]/voice/token`) with participant/host authorization and rate limiting.
- Client voice panel now uses tokenized flow and connects via `livekit-client` when available (with graceful token-only fallback).

## Phase 7 Definition (implemented baseline)

Phase 7 objective: productionize Studio async rendering by strengthening queue reliability, retry behavior, render-output quality, and operational observability.

Baseline deliverables:

- Studio queue defaults are hardened with configurable retry attempts, exponential backoff base delay, and retention limits for completed/failed jobs.
- Producer and ops retry APIs now block duplicate in-flight jobs for the same project/job type to reduce accidental double-processing.
- Worker records attempt metadata (`attempts`, `maxAttempts`, retryability) and only marks projects failed after final retry exhaustion.
- Worker asset writes are idempotent by project/kind/url, reducing duplicate `StudioAsset` rows across retries.
- Render quality controls are upgraded (quality profile support, improved H.264/HLS settings, higher quality thumbnail extraction).
- Studio stats endpoint now includes queue counts, retry/failure indicators, recent failures, and per-job-type latency aggregates.

## Phase 8 Definition (implemented baseline)

Phase 8 objective: complete Shorts as a production surface with reliable ingestion, ranking, moderation enforcement, and monetization controls.

Baseline deliverables:

- Studio publish now ingests Shorts/Memes into the feed index (`FeedPost`) with upsert-style behavior for existing references.
- Shorts listing is now ranked by recency + engagement + editorial + purchase signals instead of raw publish time only.
- Shorts APIs enforce moderation visibility by filtering hidden/shadowbanned and high-unresolved-report content.
- Premium access APIs now return explicit purchase requirements; purchase flow validates short state and preserves idempotency.
- Meme generation from premium shorts now enforces purchase access to prevent paywall bypass.
- Shorts page rendering now uses production ranking/moderation behavior instead of raw unranked DB output.

## Phase 9 Definition (implemented baseline)

Phase 9 objective: complete Games as a production surface with discoverable catalog experiences, playable embeds, reliable creator publishing flow, and platform telemetry.

Baseline deliverables:

- `/games` now combines a catalog experience (curated + community picks) with the existing generator gameplay flow.
- `/games/[slug]` no longer uses placeholder UI; it now renders a playable embedded experience via `/games/embed/[slug]` plus direct-open play links.
- GameGrid creator publish flow now emits explicit telemetry events when games are published from `/games/create`.
- Dedicated games telemetry endpoint (`POST /api/games/telemetry`) validates analytics payloads and persists events into `PlatformEvent` for admin analytics.
- Games telemetry events now cover catalog view, game open, direct open, embed load, and creator publish milestones.

## Phase 10 Definition (implemented baseline)

Phase 10 objective: unify external app embedding standards and UX behavior across News, GameGrid, PixelBrawl, and Art Atlas.

Baseline deliverables:

- External app registry metadata is normalized (`name`, `category`, `tagline`, launch URL, route) and reused consistently across the shell.
- Embedded app shell now uses one standard layout for all external modules (category/status chips, unified launch actions, consistent frame container).
- Embedded routes now emit standardized telemetry (`module_open` on embedded route entry and `module_open_direct` on direct launch action).
- Embedded app UX now includes a unified load state and a consistent direct-launch fallback path across all external modules.
- Platform directory entries now render from standardized external metadata so labels/categories/summaries are consistent with embedded routes.

## Phase 11 Definition (implemented baseline)

Phase 11 objective: upgrade Home/Feed intelligence and trust-safety automation so discovery is relevance-ranked and high-risk content is automatically constrained.

Baseline deliverables:

- Wall feed now ranks from `FeedPost` records (not raw content items) with recency, engagement, editorial boosts, and viewer affinity signals.
- Shorts and wall feeds now both persist anonymous identity for safer viewer-aware ranking and interaction continuity.
- Feed report pipeline now performs automated trust-safety actions by unresolved-report and unique-reporter thresholds.
- Severe report reason classes now accelerate automatic shadowban decisions with lower reporter thresholds.
- Admin feed settings now expose active ranking + moderation policy thresholds for operational visibility.

## Phase 12 Definition (implemented baseline)

Phase 12 objective: complete the Admin/Ops command center with production-ready control safety, operational visibility, and auditable operator actions.

Baseline deliverables:

- Ops command center APIs now enforce strict payload validation for briefing updates, enqueue actions, task status mutations, and runner invocations.
- Admin ops mutation endpoints now include per-endpoint rate limiting to protect against accidental burst actions.
- All ops control mutations now emit admin audit entries (`OPS_BRIEFING_SAVED`, `OPS_TASKS_ENQUEUED`, `OPS_RUN_TRIGGERED`, `OPS_TASK_STATUS_UPDATED`).
- Ops state API now returns queue health summary (blocked, stale pending, stale in-progress) and generation timestamp for dashboard freshness.
- Ops dashboard now surfaces command-center health cards for blocked and stale work, plus snapshot freshness metadata.

## Phase 13 Definition (implemented baseline)

Phase 13 objective: upgrade autonomous operations with safer Director/Specialist closed-loop execution behavior.

Baseline deliverables:

- Ops Brain roadmap/signal/decision artifacts are persisted under `docs/ops_brain/` for durable context handoff.
- Specialist runbook updates are integrated into task execution flow for recurring incident classes.
- Director/Specialist task queue states are normalized (`pending`, `in_progress`, `done`, `blocked`) with staleness-aware routing.

## Phase 14 Definition (implemented baseline)

Phase 14 objective: enforce quality engineering and release gates that block unsafe changes before promotion.

Baseline deliverables:

- Root `shipcheck` and `shipcheck:quick` enforce gated lint/type/unit/e2e verification.
- DB migration safety and schema validation are part of release gating via `db:safety`.
- PR-size guardrail warnings are emitted automatically by shipcheck for oversized changes.

## Phase 15 Definition (implemented baseline)

Phase 15 objective: establish platform observability with explicit SLO evaluation and incident runbook execution paths.

Baseline deliverables:

- Admin observability summary endpoint is available at `GET /api/admin/observability/summary`.
- SLO manifest is defined in `ops/governance/slos.json` and evaluated against live operational metrics.
- Incident response runbook is documented at `docs/ops_brain/runbooks/incident-response.md`.
- Runbook index now includes incident response escalation path.

## Phase 16 Definition (implemented baseline)

Phase 16 objective: formalize deployment architecture and environment promotion readiness for `dev/stage/prod`.

Baseline deliverables:

- Deployment promotion requirements are documented in `docs/deployment-promotion.md`.
- Deployment profile manifest is defined in `ops/governance/deployment.json`.
- Admin deployment readiness endpoint is available at `GET /api/admin/deploy/promotion-readiness`.
- `NEXTAUTH_URL` is now included in the root environment template for stage/prod parity.

## Phase 17 Definition (implemented baseline)

Phase 17 objective: strengthen growth and recommendation intelligence with measurable ranking and conversion diagnostics.

Baseline deliverables:

- Admin growth intelligence endpoint is available at `GET /api/admin/growth/recommendations`.
- Feed recommendation diagnostics now expose score-ranked post candidates and unresolved-report context.
- Cross-module growth funnel diagnostics now expose open vs direct-open conversion rates from `PlatformEvent`.

## Phase 18 Definition (implemented baseline)

Phase 18 objective: enforce financial governance through budget manifests and spend guardrail evaluation.

Baseline deliverables:

- Monthly budget manifest is defined in `ops/governance/budgets.json`.
- Admin finance guardrail endpoint is available at `GET /api/admin/finance/guardrails`.
- Spend status now includes render/storage/ops-automation estimated-cost dimensions with breach/warning state.

## Phase 19 Definition (implemented baseline)

Phase 19 objective: operationalize compliance readiness across privacy, retention, policy enforcement, and auditability.

Baseline deliverables:

- Compliance control manifest is defined in `ops/governance/compliance-controls.json`.
- Compliance evidence baselines are documented under `docs/compliance/`.
- Admin compliance status endpoint is available at `GET /api/admin/compliance/status`.
- Compliance status now evaluates evidence-file presence and unresolved-report aging risk.

## Phase 20 Definition (implemented baseline)

Phase 20 objective: establish launch readiness gates and post-launch optimization cadence grounded in measurable blockers.

Baseline deliverables:

- Launch gate manifest is defined in `ops/governance/launch-gates.json`.
- Admin launch readiness endpoint is available at `GET /api/admin/launch/readiness`.
- Launch readiness now aggregates SLO, budget, compliance, and production env-gate checks into critical blockers.
- Shipcheck now includes governance manifest validation (`pnpm governance:check`) as a release gate.

## Next 100 Phases

For execution after Phase 20, use:

- `docs/ILLUVRSE_PHASES_NEXT100.md` (Phases 21-120)
- `docs/CODEX_CONTINUOUS_RUN_PROMPT.md` (background continuous-run prompt template)
