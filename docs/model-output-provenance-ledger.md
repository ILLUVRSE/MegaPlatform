# Model Output Provenance Ledger

Phase 135 adds a provenance ledger for autonomy-generated outputs.

## Scope
- Provenance policy: `ops/governance/model-output-provenance-ledger.json`
- Runtime ledger manager: `apps/web/lib/modelOutputProvenance.ts`
- Ledger artifact: `ops/logs/model-output-provenance.json`
- Admin API:
  - `GET /api/admin/security/provenance/outputs`
  - `POST /api/admin/security/provenance/outputs`

## Behavior
- Enforces required lineage inputs and decision metadata.
- Stores deterministic ledger entries keyed by output ID.
- Exposes provenance history for audit and forensic review.
