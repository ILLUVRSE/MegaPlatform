# Party Core

## Overview
Party Core delivers seat-based lobbies, real-time presence, and leader-synced playback for ILLUVRSE watch parties. It uses Postgres (Prisma) for canonical data and Redis for ephemeral world-state + pub/sub.

## Routes
- `GET /party` — landing page.
- `GET /party/create` — host creation form.
- `GET /party/[code]` — participant join view.
- `GET /party/[code]/host` — host controls view.

## API Endpoints
- `POST /api/party/create`
  - Body: `{ name, seatCount, isPublic }`
  - Response: `{ code, partyId, hostId }`
- `GET /api/party/[code]`
  - Response: `{ party, state }`
- `POST /api/party/[code]/join`
  - Body: `{ userId, displayName? }`
  - Response: `{ status: "ok" }`
- `POST /api/party/[code]/reserve`
  - Body: `{ seatIndex, userId, refresh? }`
  - Response: `{ seatIndex, state }`
- `POST /api/party/[code]/release`
  - Body: `{ seatIndex, userId }`
  - Response: `{ seatIndex, state }`
- `POST /api/party/[code]/lock`
  - Body: `{ seatIndex, locked, occupantId? }`
  - Response: `{ seatIndex, state }`
- `POST /api/party/[code]/playback`
  - Body: `{ action, leaderTime, playbackPositionMs, currentIndex, playbackState }`
  - Response: authoritative playback snapshot with timeline metadata
- `GET /api/party/[code]/events`
  - SSE stream of `snapshot`, `seat_update`, `playback_update`, `presence_update`, and `keepalive` events.
- `GET /api/party/[code]/playlist`
  - Response: `{ items: [{ episodeId, order, episode: { title, assetUrl } }] }`
- `PUT /api/party/[code]/playlist`
  - Body: `{ items: [{ episodeId, order }] }` (host-only)
- `POST /api/party/[code]/playlist/append`
  - Body: `{ shortPostId, position?: "append" | "next" }` (host-only)
- `POST /api/party/[code]/presence/ping`
  - Body: none (participant/host heartbeat)
  - Response: `{ ok, lastSeenAt, pingCount, lastHostHeartbeatAt }`
- `POST /api/party/[code]/voice/token`
  - Body: none (participant/host only)
  - Response: token payload or graceful token-only fallback payload
- `GET /api/admin/party/health`
  - Response: presence SLO summary per party including heartbeat freshness and last host heartbeat
- `GET /api/media/shows`
- `GET /api/media/shows/[id]/seasons`
- `GET /api/media/seasons/[id]/episodes`
- `GET /api/media/episodes?query=...`

## Environment Variables
- `DATABASE_URL` — Postgres connection string for Prisma.
- `REDIS_URL` — Redis connection string (e.g. `redis://localhost:6379`).
- `NEXT_PUBLIC_LIVEKIT_URL` — optional LiveKit URL (stubbed UI).
- `LIVEKIT_API_KEY` — server key for token issuance.
- `LIVEKIT_API_SECRET` — server secret for token issuance.
- `NEXTAUTH_SECRET` — required for NextAuth in tests.

## Redis (Docker)
```bash
docker run --name illuvrse-redis -p 6379:6379 redis:7
```

## World-State Service
The world-state helper lives in `packages/world-state` and is imported directly by Next.js route handlers. No separate service process is required, but Redis must be running.

Seat reservations expire after 30 seconds unless refreshed (clients refresh every 10 seconds while holding).

Playlist changes publish `playlist_update` SSE events and clients refetch `/api/party/[code]/playlist`.
Presence heartbeats update party-level heartbeat counters in Redis-backed world-state and emit `keepalive` plus host `snapshot` events for reconnect reconciliation.

## Playback Sync Algorithm (Leader Model)
1. Host sends a heartbeat every 2 seconds while playback is active.
2. The server rewrites playback timestamps using its own clock and publishes authoritative `playback_update` events.
3. Followers estimate position as `playbackPositionMs + (Date.now() - leaderTime)` only while the room is playing.
4. Client smooths small drift, snaps large drift, and applies a short soft-lock when the host seeks or rewrites the timeline.
5. After SSE reconnect, the host performs a `resume` handshake to reclaim the authoritative playhead before resuming heartbeats.

## Playlist Seeding (Prisma)
Episodes are seeded in `packages/db/seed.ts`. Seeded shows + episodes can be browsed in the media picker.

Example SQL to add playlist items:
```sql
INSERT INTO "PlaylistItem" (id, "partyId", "episodeId", "assetUrl", "order", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '<party-id>', '<episode-id>', 'https://cdn.illuvrse.dev/assets/nebula-nights-ep1.mp4', 0, now(), now());
```

Or via Prisma seed:
```bash
pnpm prisma:seed
```

## Running Locally
From repo root:
```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

## Tests
Unit tests:
```bash
pnpm test
```

E2E (requires dev server + Redis running):
```bash
pnpm test:e2e
```

## LiveKit Notes
`apps/web/app/party/lib/livekit.ts` now requests server-issued tokens from `/api/party/[code]/voice/token`. If `livekit-client` is installed, it connects through the SDK; otherwise it runs token-only mode and surfaces status. If the deployment cannot issue LiveKit credentials, the API returns a graceful token-only fallback instead of hard failing.

## Reliability Controls
- `PARTY_HEARTBEAT_TIMEOUT_MS` controls when presence heartbeats are considered stale on the server.
- `NEXT_PUBLIC_PARTY_PRESENCE_PING_MS` controls the browser heartbeat cadence.
- `NEXT_PUBLIC_PARTY_RECONNECT_BASE_MS`, `NEXT_PUBLIC_PARTY_RECONNECT_MAX_MS`, and `NEXT_PUBLIC_PARTY_RECONNECT_ATTEMPTS` control exponential SSE reconnect behavior.

## Permissions
Playlist editing and playback controls are host-only and enforced server-side from the authenticated session.
