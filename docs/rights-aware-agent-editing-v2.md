# Rights-Aware Agent Editing v2

Phase 152 adds preflight rights enforcement for autonomous edit/remix flows.

## Scope
- Rights policy: `ops/governance/rights-aware-agent-editing-v2.json`
- Runtime enforcer: `apps/web/lib/rightsAwareAgentEditing.ts`
- Admin API: `POST /api/admin/creator/rights/agent-editing/enforce`

## Behavior
- Blocks edits for disallowed license states.
- Requires derivative/distribution rights before execution.
- Enforces attribution and pending-claim constraints before derivative actions.
