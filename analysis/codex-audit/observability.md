# Observability and SLO Baseline

## Current ingestion proofs

- Platform shell events persist via `POST /api/platform/events`.
- Games telemetry persists via `POST /api/games/telemetry`.
- Party runtime emits SSE keepalives via `GET /api/party/[code]/events`.
- Party heartbeat updates presence via `POST /api/party/[code]/presence/ping`.

## Required SLOs

| Surface | Event(s) | SLO |
| --- | --- | --- |
| Platform shell | `platform.page_load`, `module_open`, `module_open_direct` | nav errors < 0.5%, shell API p95 < 300ms |
| Watch / Live | `watch.playback_start`, `watch.entitlement_denied`, `live.health` | live health OK 99.5% |
| Party / Voice | `party.join`, `party.presence.heartbeat`, `party.voice.token.issued` | heartbeat keepalive success > 99.9% |
| Games | `games.catalog.view`, `game.embed.load`, `game.publish` | embed load success > 99.5% |

## Minimal schemas

### Platform shell

```json
{
  "event": "module_open",
  "module": "GameGrid",
  "href": "/gamegrid",
  "surface": "apps_directory",
  "timestamp": "2026-03-11T00:00:00.000Z"
}
```

### Watch / Live

```json
{
  "event": "watch.playback_start",
  "contentId": "episode_123",
  "surface": "watch_episode",
  "profileId": "profile_kids",
  "timestamp": "2026-03-11T00:00:00.000Z"
}
```

### Party / Voice

```json
{
  "event": "party.voice.token.issued",
  "partyCode": "ABC123",
  "userId": "user_1",
  "isHost": true,
  "surface": "party_room",
  "timestamp": "2026-03-11T00:00:00.000Z"
}
```

### Games

```json
{
  "event": "embed_loaded",
  "surface": "games_embed",
  "gameSlug": "pixelpuck",
  "href": "/games/embed/pixelpuck",
  "timestamp": "2026-03-11T00:00:00.000Z"
}
```

## Gaps

- No dedicated watch/live telemetry ingestion route equivalent to `/api/games/telemetry`.
- Party/voice events are operationally present but not persisted as first-class platform telemetry.
- No explicit SLO evaluation output was captured in this audit beyond existing route/test evidence.
- Satellite products do not share one telemetry contract.

## First implementation steps

1. Extend `apps/web/lib/platformEvents.ts` with `watch.*`, `live.*`, and `party.*` events.
2. Add `POST /api/watch/telemetry` and `POST /api/party/telemetry`, or converge on a typed unified telemetry route.
3. Store event outcomes in `PlatformEvent` with surface-specific dimensions.
4. Bind `ops/governance/slos.json` checks to those events and expose status through `/api/admin/observability/summary`.
