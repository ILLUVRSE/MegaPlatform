# Reputation-Weighted Distribution

Phase 158 adds reputation-weighted distribution logic to throttle low-trust entities and reward high-trust quality creators.

## Scope
- Distribution policy: `ops/governance/reputation-weighted-distribution.json`
- Runtime evaluator: `apps/web/lib/reputationWeightedDistribution.ts`
- Admin API: `POST /api/admin/creator/distribution/reputation/evaluate`

## Behavior
- Computes distribution score from quality and reputation signals.
- Throttles low-reputation entities by policy-defined limits.
- Boosts high-reputation creators when trust criteria are satisfied.
