# Autonomy Control Plane v3

Phase 130 composes autonomy policy runtime checks into one control-plane evaluation interface.

## Scope
- Control-plane policy: `ops/governance/autonomy-control-plane-v3.json`
- Runtime aggregator: `apps/web/lib/autonomyControlPlaneV3.ts`
- Admin API: `POST /api/admin/autonomy/control-plane/v3`

## Behavior
- Evaluates unified constraints, temporal windows, change budgets, and blast radius.
- Applies block signal policy to produce final allow/deny outcomes.
- Returns deterministic blocker list plus bounded recommended mitigation actions.
