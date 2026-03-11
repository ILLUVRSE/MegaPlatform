# Data Retention Enforcement v1

Phase 74 codifies retention/deletion jobs by data class with evidence artifacts.

## Governance Manifest

- `ops/governance/data-retention-policies.json`

Each policy defines:

- `dataClass`
- `retentionDays`
- `deletionMode` (`delete` or `anonymize`)
- `evidencePath`

## Evidence

- `docs/compliance/evidence/data-retention-runs.json` stores deterministic retention job outcomes.

## Admin API

- `GET /api/admin/compliance/retention/jobs`: policy + evidence status
- `POST /api/admin/compliance/retention/jobs`: executes retention run simulation and audits `RETENTION_JOBS_RUN`
