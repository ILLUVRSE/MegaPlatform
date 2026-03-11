# Autonomous Change Budgeting

Phase 128 adds policy-driven change budgeting for autonomous execution.

## Scope
- Budget policy: `ops/governance/autonomy-change-budgeting.json`
- Runtime evaluator: `apps/web/lib/autonomyChangeBudgeting.ts`
- Admin API: `POST /api/admin/autonomy/change-budgets/evaluate`

## Behavior
- Tracks projected change-unit usage by change class.
- Produces deterministic `ok`/`warning`/`blocked` budget status.
- Blocks change execution when projected usage exceeds class limits.
