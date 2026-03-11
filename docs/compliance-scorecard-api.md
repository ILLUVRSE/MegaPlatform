# Compliance Scorecard API

Phase 79 adds a machine-readable compliance scorecard endpoint with explicit evidence pointers.

## Endpoint

- `GET /api/admin/compliance/scorecard`

## Output

- `controls[]` with:
  - `id`
  - `name`
  - `pass`
  - `required`
  - `owner`
  - `evidencePath`
- `summary` (`total`, `passed`, `failed`)

## Evidence Sources

- compliance control files from `ops/governance/compliance-controls.json`
- retention evidence (`docs/compliance/evidence/data-retention-runs.json`)
- DSAR evidence (`docs/compliance/evidence/dsar-requests.json`)
- key rotation policy (`ops/governance/key-rotation.json`)
