# Party Minigames (Party Night v2)

## Overview
Party Minigames adds a Mario Party-style loop on top of the deterministic minigame generator. A host creates a room, players join by code, and every round shares the same generated `MinigameSpec` and seed. The server runs the authoritative simulation and streams snapshots to clients.

Party Night introduces multiple rounds, ready checks, intermissions, placements/points, and final podium results.

## Dependencies
- Redis (required for room state + pub/sub)
- Postgres/MinIO are **not** required for Party Minigames itself

### Redis quick start
- `redis-server` (local)
- `REDIS_URL=redis://localhost:6379`

## Host/Join Flow
1. Visit `/party/minigames`
2. Host: enter a name and create a room
3. Players: enter the room code + name
4. Everyone readies up
5. Host presses **Start Round**

## Party Night Phases
- **LOBBY**: players toggle Ready / Spectate
- **COUNTDOWN**: server-authoritative startAt (3…2…1)
- **PLAYING**: 30s round (3s when `NEXT_PUBLIC_E2E_FAST_TIMER=1`)
- **INTERMISSION**: round results + scoreboard (auto timer)
- **SESSION_END**: final podium + scoreboard

## Scoring Rules
- Each minigame reports a raw score per player.
- Placement (by raw score, tie-break by completion time then playerId) awards Party Points:
  - 1st: 3 points
  - 2nd: 2 points
  - 3rd: 1 point
  - 4th+: 0 points
  - If only 2 players: winner 3, loser 1

## Spectators
- Joining mid-round makes you a **Spectator**.
- Spectators can watch snapshots, but inputs are ignored.
- Spectators can toggle to **Play Next Round** during intermission/lobby.

## Message Protocol
### Client -> server (HTTP)
- `POST /api/party/minigames/create`
  - `{ playerName }`
- `POST /api/party/minigames/[code]/join`
  - `{ playerName }`
- `POST /api/party/minigames/[code]/ready`
  - headers: `x-player-id`
  - `{ ready }`
- `POST /api/party/minigames/[code]/start`
  - `{ playerId, forceStart? }` (host only)
- `POST /api/party/minigames/[code]/next-round`
  - `{ playerId }` (host only)
- `POST /api/party/minigames/[code]/role`
  - headers: `x-player-id`
  - `{ role }`
- `POST /api/party/minigames/[code]/input`
  - `{ playerId, t, input }`
- `POST /api/party/minigames/[code]/ping`
  - headers: `x-player-id`

### Server -> client (SSE)
- `room_state` `{ players, hostId, phase, currentRound, scoreboard }`
- `round_countdown` `{ startAt, roundIndex }`
- `round_start` `{ seed, spec, startAt, endAt, roundIndex }`
- `snapshot` `{ t, playerId, state, hud, scores }`
- `round_end` `{ results, scores }`
- `intermission` `{ endsAt }`
- `session_end` `{ scores }`
- `error` `{ message }`

## Runtime Notes
- Authoritative sim runs server-side with a headless runtime.
- Clients render from snapshots (no prediction in v1/v2).
- `NEXT_PUBLIC_E2E_FAST_TIMER=1` shortens round duration and reduces rounds to 2.

## Future Improvements
- Client-side prediction + rollback
- Interest management per player
- Spectator camera controls
