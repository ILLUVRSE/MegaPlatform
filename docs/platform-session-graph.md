# Platform Session Graph

Phase 301 establishes a shared session graph for the shell and cross-module flows.

## Runtime

- Persistence: `PlatformSessionGraph` in `packages/db/schema.prisma`
- World-state helpers: `packages/world-state/src/platformSession.ts`
- Runtime: `apps/web/lib/platformSessionGraph.ts`
- API: `GET/POST /api/platform/session`

## Covered modules

- Home
- Watch
- Party
- Studio
- Games

The graph stores current module, source context, active task, party code, squad binding, and a bounded action trail.
