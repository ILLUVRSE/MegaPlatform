# Service Dependency Health Matrix

Phase 71 introduces a governed runtime dependency matrix used by admin health snapshots.

## Manifest

- `ops/governance/service-dependencies.json`

Each dependency defines:

- `criticality`: `critical | high | medium | low`
- `blastRadius`: impacted surfaces if degraded or down
- `check`: how health is evaluated (`db_query`, `env_present`, `always_healthy`)
- `envKeys`: required environment variables for dependency readiness

## Health Endpoint

- `GET /api/admin/observability/summary` now includes `dependencyHealth`:
  - `dependencies`: dependency rows with `status`, `criticality`, and `missingEnv`
  - `summary`: counts by criticality and degraded/unhealthy states

## Governance

- `pnpm governance:check` validates `service-dependencies.json` shape and duplicate IDs.
