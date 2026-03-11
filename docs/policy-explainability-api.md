# Policy Explainability API

Phase 127 introduces a unified explainability response for autonomy policy decisions.

## Scope
- Explainability policy: `ops/governance/policy-explainability.json`
- Runtime explainability builder: `apps/web/lib/policyExplainability.ts`
- Admin API: `POST /api/admin/autonomy/policies/explain`

## Behavior
- Combines unified-constraint, temporal-window, and blast-radius decision sections.
- Provides deterministic trace snippets and decision sources.
- Optionally includes request inputs for audit reproduction.
