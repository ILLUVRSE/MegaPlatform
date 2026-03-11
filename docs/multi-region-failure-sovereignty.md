# Multi-Region Failure Sovereignty

Phase 139 adds multi-region resilience policy checks for sovereign autonomous behavior during outages.

## Scope
- Sovereignty policy: `ops/governance/multi-region-failure-sovereignty.json`
- Runtime evaluator: `apps/web/lib/multiRegionFailureSovereignty.ts`
- Admin API: `POST /api/admin/security/regions/failover/evaluate`

## Behavior
- Evaluates primary-region availability and required control-state continuity.
- Enforces degraded action limits when sovereignty constraints are violated.
- Returns region-level diagnostics for failover and incident response decisions.
