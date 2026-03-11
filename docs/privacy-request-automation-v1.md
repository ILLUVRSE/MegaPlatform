# Privacy Request Automation v1

Phase 78 automates DSAR export/delete workflows with auditable execution records.

## Governance

- `ops/governance/dsar-workflows.json`

Defines steps, evidence path, and SLA for each DSAR type (`export`, `delete`).

## Evidence

- `docs/compliance/evidence/dsar-requests.json`

## Admin API

- `GET /api/admin/compliance/dsar/requests`
- `POST /api/admin/compliance/dsar/requests`

`POST` processes request payload (`requestId`, `type`, `userId`) and emits audit event `DSAR_REQUEST_PROCESSED`.
