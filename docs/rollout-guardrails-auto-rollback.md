# Rollout Guardrails and Auto-Rollback

Phase 85 adds rollout guardrail checks with automatic rollback trigger signaling.

## Guardrails

- `ops/governance/rollout-guardrails.json`

Each guardrail maps a metric to allowed regression and auto-rollback behavior.

## API

- `POST /api/admin/optimization/rollout/guardrails`

If any guardrail breaches with `autoRollback=true`, endpoint responds `409` and writes `AUTO_ROLLBACK_TRIGGERED` audit entry.
