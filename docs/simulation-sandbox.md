# Simulation Sandbox for Changes

Phase 83 adds offline simulation and rollout preflight validation.

## Policy

- `ops/governance/simulation-policy.json`

## APIs

- `POST /api/admin/optimization/simulation`
- `POST /api/admin/optimization/rollout/preflight`

Rollout preflight returns `409` when simulation evidence is missing or fails policy thresholds.
