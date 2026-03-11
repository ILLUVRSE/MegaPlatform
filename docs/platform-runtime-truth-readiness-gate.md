# Platform Runtime Truth Readiness Gate

Phase 310 adds a hard readiness check for phases 301-309.

## Runtime

- Manifest: `ops/governance/platform-runtime-truth.json`
- Runtime evaluator: `apps/web/lib/platformRuntimeReadiness.ts`
- Script: `scripts/check-platform-runtime-readiness.mjs`
- API: `GET /api/admin/platform/runtime-readiness`

## Gate behavior

The check fails if required docs, APIs, or core runtime files are missing. `shipcheck` now includes `platform:runtime:check`.
