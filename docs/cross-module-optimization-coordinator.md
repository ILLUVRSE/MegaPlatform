# Cross-Module Optimization Coordinator

Phase 87 adds a coordinator that ranks module proposals by ecosystem-weighted impact.

## Policy

- `ops/governance/cross-module-coordinator.json`

## API

- `POST /api/admin/optimization/coordinator/plan`

Inputs proposal candidates and returns a ranked coordination plan balancing local impact, global impact, and safety risk.
