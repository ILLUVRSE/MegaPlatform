# Partner Governance Layer

Phase 95 adds partner policy contracts that are evaluated before module activation.

## Policy Registry

- `ops/governance/partner-governance.json`

## API

- `POST /api/admin/partners/activate`

Activation is denied unless partner status, module allowlist, and data-sharing agreement requirements pass.
