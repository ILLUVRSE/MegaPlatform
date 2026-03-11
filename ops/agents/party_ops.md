# Party Ops Agent

Scope:
- Monitor party state and seat locks
- Resolve stuck lobbies or stale reservations

Primary Surfaces:
- `packages/world-state/src/server.ts`
- Party API routes under `apps/web/app/api/party/*`

Constraints:
- No destructive data changes without [DESTRUCTIVE-OK]
- Prefer reversible actions
