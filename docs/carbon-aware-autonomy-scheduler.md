# Phase 166 - Carbon-Aware Autonomy Scheduler

Phase 166 adds carbon-aware scheduling decisions for non-urgent workloads.

- Policy: `ops/governance/carbon-aware-autonomy-scheduler.json`
- Runtime: `apps/web/lib/carbonAwareAutonomyScheduler.ts`
- API: `POST /api/admin/finance/carbon-scheduler/evaluate`

Eligible workloads are deferred or blocked based on carbon policy signals.
