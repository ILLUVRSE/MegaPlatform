# Production Readiness Certification Gate

Phase 80 introduces explicit production certification checks for high-risk launches.

## Governance Rules

- `ops/governance/production-certification.json`

Rules map required checks to machine-evaluable metrics:

- `launch_blockers`
- `key_rotation_overdue`
- `supply_chain_blockers`

## Admin API

- `GET /api/admin/launch/certification`: current certifiability + blockers
- `POST /api/admin/launch/certification`: attempts certification for a `releaseId`

`POST` is blocked (`409`) unless all required checks pass. Successful certifications are audited as `PRODUCTION_CERTIFIED`.
