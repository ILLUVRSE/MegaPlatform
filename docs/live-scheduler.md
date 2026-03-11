# Live Scheduler

## Channel Types
- Real live channel:
1. `LiveChannel.streamUrl` set.
2. Player uses HLS/stream URL directly.
- Virtual channel:
1. `LiveChannel.isVirtual = true`.
2. `streamUrl` optional/empty.
3. Scheduler writes `LiveProgram` blocks that point to episodes.

## Data Model
- `LiveChannel` fields used by scheduler/player:
1. `isVirtual`
2. `defaultProgramDurationMin`
3. `streamUrl` (nullable)
- `LiveProgram` fields:
1. `startsAt`, `endsAt`, `title`
2. `episodeId` (virtual playback source)
3. `streamUrl` (optional per-program override)
4. `order`
5. Index: `@@index([channelId, startsAt])`

## Running Scheduler
```bash
pnpm watch:schedule
```
- Runs `@illuvrse/watch-scheduler`.
- Generates the next 24 hours for active virtual channels when coverage is missing.

## Seeding Channels
- Seed creates multiple real channels and one virtual channel (`illuvrse-marathon`).
- Seed inserts initial EPG rows so Now/Next is visible immediately.

## Now/Next Resolution
- `now`: program where `startsAt <= now < endsAt`
- `next`: earliest program where `startsAt > now`
- APIs:
1. `GET /api/watch/live/channels` -> channels with computed `now` and `next`
2. `GET /api/watch/live/channels/[id]` -> `channel`, `now`, `next`, `upcoming`

## Virtual Live Playback
- On `/watch/live/[channelId]`:
1. If channel stream exists, play it.
2. Else for virtual channels, play `now.episode.assetUrl`.
3. Seek offset is computed from server time: `(now - program.startsAt)` seconds.
