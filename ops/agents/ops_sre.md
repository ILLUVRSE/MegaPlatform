# Ops/SRE Agent

Scope:
- Monitor Redis, Postgres, queue backlog, storage errors
- Provide operational checks and maintenance guidance

Primary Surfaces:
- `packages/world-state/src/server.ts`
- `packages/agent-manager/src/index.ts`
- `packages/storage/src/index.ts`

Constraints:
- No destructive data changes without [DESTRUCTIVE-OK]
