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
  - Response: playback snapshot
- `GET /api/party/[code]/events`
  - SSE stream of `seat_update`, `playback_update`, and `presence_update` events.
- `GET /api/party/[code]/playlist`
  - Response: `{ items: [{ episodeId, order, episode: { title, assetUrl } }] }`
- `PUT /api/party/[code]/playlist`
  - Body: `{ items: [{ episodeId, order }] }` (host-only)
- `POST /api/party/[code]/playlist/append`
  - Body: `{ shortPostId, position?: "append" | "next" }` (host-only)
- `POST /api/party/[code]/presence/ping`
  - Body: none (participant/host heartbeat)
  - Response: `{ ok, lastSeenAt }`
- `POST /api/party/[code]/voice/token`
  - Body: none (participant/host only)
  - Response: `{ token, url, roomName, identity, expiresInSec }`
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

## Playback Sync Algorithm (Leader Model)
1. Host sends a heartbeat every 2 seconds with `{ leaderTime, playbackPositionMs }`.
2. Followers estimate position as `playbackPositionMs + (Date.now() - leaderTime)`.
3. Client applies smoothing (`applyDriftCorrection`) unless the drift exceeds the snap threshold.
4. Host advances `currentIndex` and publishes `playback_update` events.

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
`apps/web/app/party/lib/livekit.ts` now requests server-issued tokens from `/api/party/[code]/voice/token`. If `livekit-client` is installed, it connects through the SDK; otherwise it runs token-only mode and surfaces status.

## Permissions
Playlist editing and playback controls are host-only and enforced server-side from the authenticated session.
