# Dispute Resolution Automation

Phase 159 adds automated dispute intake/resolution workflow state handling with evidence linkage.

## Scope
- Dispute workflow policy: `ops/governance/dispute-resolution-automation.json`
- Dispute store: `ops/logs/dispute-resolution-automation.json`
- Runtime workflow manager: `apps/web/lib/disputeResolutionAutomation.ts`
- Admin APIs:
  - `GET /api/admin/creator/disputes`
  - `POST /api/admin/creator/disputes`

## Behavior
- Runs disputes through deterministic policy-defined workflow states.
- Requires evidence references for every dispute record.
- Enforces open-dispute limits and rejects invalid state transitions.
