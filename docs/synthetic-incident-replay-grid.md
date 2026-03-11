# Synthetic Incident Replay Grid

Phase 132 adds deterministic replay scoring for synthetic incident scenarios.

## Scope
- Replay policy: `ops/governance/synthetic-incident-replay-grid.json`
- Runtime replay evaluator: `apps/web/lib/syntheticIncidentReplayGrid.ts`
- Admin API: `POST /api/admin/security/incidents/replay`

## Behavior
- Replays incident response artifacts against required response fields.
- Severity-weighted scoring determines pass/fail readiness.
- Produces replay-level diagnostics for continuous incident preparedness.
