# Adaptive Friction System

Phase 147 adds policy-bound dynamic friction controls that trigger when risk is high or confidence is low.

## Scope
- Friction policy: `ops/governance/adaptive-friction-system.json`
- Runtime evaluator: `apps/web/lib/adaptiveFrictionSystem.ts`
- Admin API: `POST /api/admin/trust/friction/adaptive/evaluate`

## Behavior
- Assigns risk tiers from policy thresholds.
- Applies tier-specific friction interventions with a per-session intervention cap.
- Escalates to manual review when confidence is low or intervention budgets are exhausted.
