# Cross-Loop Priority Arbiter

Phase 124 adds deterministic arbitration for competing autonomy loop actions.

## Scope
- Arbiter policy: `ops/governance/cross-loop-priority-arbiter.json`
- Arbiter runtime: `apps/web/lib/crossLoopPriorityArbiter.ts`
- Admin API: `POST /api/admin/autonomy/priorities/arbitrate`

## Behavior
- Evaluates each candidate against unified constraint decisions.
- Applies loop-specific weights to normalized base priorities.
- Excludes blocked decisions and returns a deterministic selected set.
