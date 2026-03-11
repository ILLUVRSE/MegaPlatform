# Autonomy Blast-Radius Guardrails

Phase 125 introduces blast-radius policy checks before high-impact autonomous actions execute.

## Scope
- Guardrail policy: `ops/governance/autonomy-blast-radius-guardrails.json`
- Runtime evaluator: `apps/web/lib/autonomyBlastRadius.ts`
- Admin API: `POST /api/admin/autonomy/guardrails/blast-radius/check`

## Behavior
- Evaluates risk score, affected domain count, and estimated user impact.
- Returns deterministic violations and approval-required state.
- Produces a hard block when policy limits are exceeded.
