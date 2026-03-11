# Phase 164 - Token Economy Stabilizer

Phase 164 introduces control-band stabilization for token/compute economics.

- Policy: `ops/governance/token-economy-stabilizer.json`
- Runtime: `apps/web/lib/tokenEconomyStabilizer.ts`
- API: `POST /api/admin/finance/token-economy/stabilize`

The stabilizer computes budget variance and enforces configured control-band behavior with deterministic corrective actions when variance exceeds allowed bounds.
