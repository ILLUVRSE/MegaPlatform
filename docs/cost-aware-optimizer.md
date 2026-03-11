# Cost-Aware Optimizer

Phase 89 adds cost-aware optimization planning with explicit cost impact checks.

## Policy

- `ops/governance/cost-aware-optimizer.json`

## API

- `POST /api/admin/optimization/cost-aware/plan`

Each action includes estimated cost metadata; plans are rejected when action-level or plan-level cost limits are exceeded.
