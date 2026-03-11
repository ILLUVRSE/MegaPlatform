# Config Contract Enforcement (Phase 28)

## Validation Script
- `scripts/config-contract-check.mjs`

## Command
- `pnpm config:contract:check`

## Enforcement
- Cross-checks `ops/governance/deployment.json` required env keys against root `.env.example`.
- Fails if required keys are missing from env template.
- Included in `shipcheck` and `shipcheck:quick`.
