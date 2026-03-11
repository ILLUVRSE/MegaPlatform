# Supply Chain Security Baseline

Phase 77 establishes deterministic supply-chain vulnerability gating.

## Policy + Report Inputs

- `ops/governance/supply-chain-policy.json`
- `ops/security/vulnerability-report.json`

## Gate

- `pnpm security:supply-chain:check`

The gate fails when unresolved vulnerabilities match policy blockers:

- Severity at/above `failOnSeverity`
- Package appears in `blockedPackages` and is not in `allowlist`

`shipcheck` now runs this gate to block critical unresolved vulnerabilities before promotion.

## Admin API

- `GET /api/admin/security/supply-chain`
