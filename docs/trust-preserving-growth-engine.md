# Trust-Preserving Growth Engine

Phase 148 adds a policy-enforced growth evaluator that blocks growth actions when trust and safety risk thresholds are breached.

## Scope
- Growth policy: `ops/governance/trust-preserving-growth-engine.json`
- Runtime evaluator: `apps/web/lib/trustPreservingGrowthEngine.ts`
- Admin API: `POST /api/admin/trust/growth/preserve/evaluate`

## Behavior
- Requires a minimum trust/safety signal set for every growth action evaluation.
- Computes trust and safety risks against policy thresholds.
- Blocks explicitly disallowed growth patterns and returns deterministic block reasons.
