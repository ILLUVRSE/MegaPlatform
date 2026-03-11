# Personalization Ethics Layer

Phase 141 adds a policy-bound ethics evaluator for personalization decisions to enforce fairness and anti-manipulation constraints.

## Scope
- Ethics policy: `ops/governance/personalization-ethics-layer.json`
- Runtime evaluator: `apps/web/lib/personalizationEthics.ts`
- Admin API: `POST /api/admin/trust/personalization/ethics/evaluate`

## Behavior
- Computes per-request preference skew from ranked candidate scores.
- Enforces minimum diversity and maximum manipulation-risk policy thresholds.
- Blocks sensitive-attribute targeting for protected classes when policy requires.
