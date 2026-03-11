# Failure Injection Framework

Phase 72 establishes scheduled, safe-mode failure drills for queue/storage/realtime dependencies.

## Governance Manifest

- `ops/governance/failure-drills.json`

Each drill defines:

- `target`: one of `queue`, `storage`, `realtime`
- `cadence`: required schedule (`weekly`, `biweekly`, etc.)
- `maxDurationMin`: bounded drill duration
- `safeModeOnly`: drill may only run with non-destructive behavior

## Reports

- Baseline report artifact: `ops/logs/failure-drills.json`
- Admin API:
  - `GET /api/admin/reliability/failure-drills`
  - `POST /api/admin/reliability/failure-drills` with `{ "drillId": "<id>" }`

`POST` returns a deterministic simulation report and writes an admin audit event (`FAILURE_DRILL_RUN`).
