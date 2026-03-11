# Universal Identity and Presence Layer

Phase 302 extends the identity contract to include creator and live-presence facets.

## Runtime

- Identity resolver: `apps/web/lib/identity.ts`
- Presence heartbeat: `apps/web/lib/platformPresence.ts`
- Persistence: `PlatformPresence`
- API: `POST /api/platform/presence`

## Result

Resolved identity now carries:

- user
- anon
- profile
- creator profile
- session key
- active presence modules
