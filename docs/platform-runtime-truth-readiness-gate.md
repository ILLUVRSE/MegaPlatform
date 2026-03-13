# Platform Runtime Truth Readiness Gate

Phase 310 adds a hard readiness check for phases 301-309.

## Runtime

- Manifest: `ops/governance/platform-runtime-truth.json`
- Runtime evaluator: `apps/web/lib/platformRuntimeReadiness.ts`
- Script: `scripts/check-platform-runtime-readiness.mjs`
- API: `GET /api/admin/platform/runtime-readiness`

## Gate behavior

The check now fails on the three highest-signal runtime blockers in this repo slice:

- Governance coverage drift: required governance manifests, launch gates, and SLO ids must exist.
- API registry drift: `docs/api-registry.web.json` must match generated route output so runtime truth is not operating on stale route metadata.
- Runtime contract gaps: required docs, APIs, and core runtime files must all be present.

`shipcheck` includes `platform:runtime:check`, and the standalone script prints each failing category explicitly.

## Admin endpoint

`GET /api/admin/platform/runtime-readiness` returns:

- `ok`: overall readiness status
- `summary`: blocker count and top 3 blockers
- `blockers`: normalized blocker list with `category` and `item`
- `apiRegistry`: route-count and drift status for `docs/api-registry.web.json`
- `readiness`: full evaluator payload for deeper inspection

The endpoint returns `200` when the runtime truth gate passes and `503` when any blocker remains.
