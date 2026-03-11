# User Agency Controls v2

Phase 142 adds persisted user agency controls so autonomy behavior can be tuned and constrained by user preference policy.

## Scope
- Agency controls policy: `ops/governance/user-agency-controls-v2.json`
- Agency controls store: `ops/logs/user-agency-controls-v2.json`
- Runtime controls manager: `apps/web/lib/userAgencyControls.ts`
- Admin APIs:
  - `GET /api/admin/trust/agency/controls`
  - `POST /api/admin/trust/agency/controls`

## Behavior
- Persists per-user autonomy mode, topic opt-outs, and personalization intensity caps.
- Enforces policy-limited autonomy modes and configurable intensity ceilings.
- Exposes query/update APIs for operators and control-plane tooling.
