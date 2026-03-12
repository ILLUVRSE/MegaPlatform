# Launch Readiness

## CI Gates

- `shipcheck` job runs `pnpm shipcheck:quick`, `pnpm db:safety`, `pnpm governance:check`, and `pnpm --filter @illuvrse/web test:unit`.
- `readiness` job runs `node scripts/check-platform-runtime-readiness.mjs`, `node scripts/evaluate-slos.mjs --fixture ops/fixtures/observability-summary.ci.json`, and `pnpm --filter @illuvrse/web test:smoke`.
- `e2e-smoke` runs `pnpm test:e2e:smoke`.

## Debugging Blockers

- `runtime_readiness_failures`: inspect missing docs, routes, or runtime files from `/api/admin/launch/readiness` or `node scripts/check-platform-runtime-readiness.mjs`.
- `critical_dependency_failures`: inspect dependency status from `/api/admin/observability/summary` and resolve missing env vars or unhealthy probes before promotion.
- SLO failures: inspect `/api/admin/observability/summary` and compare `sloSummaries` against `ops/governance/slos.json`.

## Promotion Rule

- Promotion to `main`, `stage`, or production should be blocked unless all three CI jobs pass and `/api/admin/launch/readiness` returns no critical blockers.
