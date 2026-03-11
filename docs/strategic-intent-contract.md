# Strategic Intent Contract

Phase 123 defines a canonical contract for autonomy intent artifacts.

## Scope
- Contract policy: `ops/governance/strategic-intent-contract.json`
- Runtime validator: `apps/web/lib/strategicIntent.ts`
- Admin API: `POST /api/admin/autonomy/intent/validate`

## Behavior
- Enforces required intent fields and horizon constraints.
- Requires policy references for auditable intent-to-policy linkage.
- Returns recommended objective context from adaptive goal selection for planning continuity.
