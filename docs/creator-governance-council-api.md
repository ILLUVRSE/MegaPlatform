# Creator Governance Council API

Phase 160 adds governance interfaces for creator policy proposal, voting, and outcome tracking.

## Scope
- Governance council policy: `ops/governance/creator-governance-council-api.json`
- Council store: `ops/logs/creator-governance-council.json`
- Runtime council manager: `apps/web/lib/creatorGovernanceCouncil.ts`
- Admin APIs:
  - `GET /api/admin/creator/governance/council`
  - `POST /api/admin/creator/governance/council`

## Behavior
- Records policy proposals with deterministic `open` state initialization.
- Tracks votes per proposal and resolves outcomes by quorum/approval policy.
- Exposes queryable proposal/vote/outcome state for governance evolution workflows.
