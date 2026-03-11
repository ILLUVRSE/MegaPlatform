# Phase 161 - Autonomous Finance Controller

Phase 161 introduces a policy-driven finance controller that budget-gates autonomous actions in real time.

Current reality:
- This is an admin-operated evaluator for bounded action payloads.
- It should not be read as a claim that all platform finance control is fully automated end-to-end.

## Policy

`ops/governance/autonomous-finance-controller.json` defines:
- per-action spend cap
- hourly autonomy spend cap
- minimum remaining budget ratio
- throttle multiplier for constrained execution
- blocked autonomous action types

## Runtime

`apps/web/lib/autonomousFinanceController.ts` evaluates each action against dynamic constraints and returns a deterministic gate decision:
- `allowed` when all checks pass
- `blocked` when any budget policy blocker is triggered

## API

`POST /api/admin/finance/controller/evaluate` validates payloads and returns budget gating outcomes for admin-operated autonomous actions.

Within this repo, the implemented slice is the evaluator/API path above rather than a broad autonomous finance runtime.
