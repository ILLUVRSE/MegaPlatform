# Temporal Policy Windows

Phase 126 adds time-bound policy windows for autonomy decision gating.

## Scope
- Window policy: `ops/governance/temporal-policy-windows.json`
- Runtime evaluator: `apps/web/lib/temporalPolicyWindows.ts`
- Admin API: `POST /api/admin/autonomy/policies/windows/evaluate`

## Behavior
- Evaluates action domain against UTC day/hour policy windows.
- Applies deterministic window matching and fallback default decisions.
- Returns matched window identity for auditing and debugging.
