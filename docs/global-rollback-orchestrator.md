# Global Rollback Orchestrator

Phase 129 adds deterministic rollback orchestration for autonomous change sets.

## Scope
- Rollback policy: `ops/governance/global-rollback-orchestrator.json`
- Runtime orchestrator: `apps/web/lib/globalRollbackOrchestrator.ts`
- Admin API: `POST /api/admin/autonomy/rollback/plan`

## Behavior
- Orders rollback steps by class precedence and urgency.
- Marks approval-required rollback classes explicitly.
- Produces bounded rollback plans with optional safe-mode activation.
