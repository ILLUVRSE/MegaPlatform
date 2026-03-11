# Autonomous Maturity Certification

Phase 119 adds certification logic for bounded autonomous cycles.

Current reality:
- This is a scoring/certification slice over configured signals.
- It does not certify the entire platform as broadly autonomous in production.

## Governance Policy

- `ops/governance/autonomous-maturity-certification.json`

## Runtime

- `apps/web/lib/autonomousMaturity.ts`

Computes reliability/safety/growth maturity score and certification output.

## API

- `GET /api/admin/ecosystem/maturity/certification`
