# Autonomous Org Role Simulator

Phase 104 introduces autonomous simulation across functional team roles.

## Governance Policy

- `ops/governance/org-role-simulator.json`

Defines participating roles, role objectives, and task templates.

## Runtime

- `apps/web/lib/orgRoleSimulator.ts`

Given a scenario, the simulator emits coherent role-scoped outputs with role rationale and actionable tasks.

## API

- `POST /api/admin/governance/org/simulate`

Used by oversight workflows to simulate multi-role response plans before execution.
