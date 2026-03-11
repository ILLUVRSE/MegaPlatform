# Distribution Orchestrator

Phase 69 adds scheduled cross-module distribution actions.

## Data model

- `DistributionAction`
  - module + target references
  - action type + priority
  - schedule + lifecycle status

## Orchestrator

- Planner helper: `apps/web/lib/distributionOrchestrator.ts`
- Writes deterministic scheduled action plans from ranked content candidates.

## Admin API

- `GET /api/admin/distribution/actions`
- `POST /api/admin/distribution/actions`
  - manual action creation
  - auto mode (`{ "mode": "auto" }`) to generate scheduled actions from feed candidates
