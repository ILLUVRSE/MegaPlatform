# Inter-Agent Conflict Resolver

Phase 105 adds deterministic arbitration for conflicts between agents.

## Governance Policy

- `ops/governance/inter-agent-conflicts.json`

Controls arbitration priority and deny precedence behavior.

## Runtime

- `apps/web/lib/conflictResolver.ts`

Produces a deterministic winner plus arbitration trace.

## API

- `POST /api/admin/governance/conflicts/resolve`

Returns winner, losing proposals, and a trace describing why arbitration selected that outcome.
