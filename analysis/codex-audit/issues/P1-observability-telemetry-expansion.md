Title: [P1] Expand telemetry and SLO coverage for watch, live, and party - phase:15

## Summary
The repo has working ingestion for platform shell and games telemetry, plus party runtime keepalives, but it does not yet persist a first-class watch/live/party telemetry contract aligned to the minimum SLOs needed for a production entertainment platform.

## Phase
15 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Inspect `apps/web/app/api/platform/events/route.ts`
2. Inspect `apps/web/app/api/games/telemetry/route.ts`
3. Inspect party routes under `apps/web/app/api/party`
4. Observe no equivalent persisted telemetry route for watch/live/party voice success/error events

## Acceptance criteria
- Watch/live telemetry has a typed ingestion path
- Party/voice telemetry is persisted as platform events
- `ops/governance/slos.json` evaluates the added event streams
- `/api/admin/observability/summary` exposes these SLOs

## Proposed changes
- Extend `apps/web/lib/platformEvents.ts`
- Add watch/live/party telemetry routes or a unified typed telemetry route
- Add tests for event validation and persistence

## Tests
- Unit tests for telemetry payload validation
- SLO summary tests covering the new event families

## Risk & Rollback
- Low to medium risk because telemetry fan-out can create noisy data if unscoped
- Roll back by disabling individual event families while keeping schemas in place

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:15`
- `priority:P1`
- `component:apps/web`
- `kind:feature`

## Branch
- `codex/audit/P1-observability-telemetry-expansion`
