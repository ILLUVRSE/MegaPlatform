# GameGrid Multiplayer

## Architecture Overview

GameGrid multiplayer uses a host-authoritative model:

- `/party` route handles create/join/ready/start room flow.
- `server/signaling.mjs` provides WebSocket signaling and room coordination.
- Clients use WebRTC DataChannels for in-game traffic (inputs, snapshots, events).
- Host simulates authoritative state and broadcasts snapshots/events.

Client multiplayer SDK lives in `src/mp/`:

- `protocol.ts`: message types, protocol versioning, validators.
- `serializer.ts`: safe message serialization/deserialization with payload limits.
- `room.ts`: room state machine for lobby transitions.
- `transport.ts`: WebRTC transport and reconnect-aware signaling resume.
- `clock.ts`: tick scheduling and clock offset helper.
- `netStats.ts`: latency/loss stats tracking.
- `mpAdapter.ts`: adapter contract for game sync integration.

## Running the Signaling Server

Run the signaling server in one terminal:

```bash
node server/signaling.mjs
```

Optional port override:

```bash
PORT=8787 node server/signaling.mjs
```

Client app reads signaling URL from `VITE_SIGNALING_URL` (default `ws://localhost:8787`).

## Create/Join Rooms

1. Open `/party`.
2. Enter a display name.
3. Create a room or join with room code.
4. All players toggle ready.
5. Host selects game and starts.
6. Players are routed to `/play/:gameId` with multiplayer room context.

Returning from game uses room flow and keeps room session data for reconnection/resume.

## Game Sync Classification

Real-time snapshot + input (host authority):

- `pixelpuck`
- `table-tennis`
- `foosball`
- `goalie-gauntlet`
- `penalty-kick-showdown`
- `ozark-fishing` (`FULL MP IMPLEMENTED`, event-log authoritative derby/big-catch)

Turn-based authoritative event log + reconciliation:

- `throw-darts` (`301`/`501`/`cricket`)
- `minigolf`
- `freethrow-frenzy`
- `homerun-derby`
- `pool`
- `alley-bowling-blitz`
- `card-table` (`blackjack`, `higher-lower`, `31`, `5-card-draw`, `forehead-poker`, `solitaire`, `texas-holdem`)

## Ozark Fishing Multiplayer

- Status: `FULL MP IMPLEMENTED (event-log host authority)`.
- Modes: Party Derby and Big Catch Party.
- Host owns fish outcomes, bite windows, hook results, catches, and leaderboard authority.
- Clients send only intent inputs (`cast`, `hookAttempt`, `reelInput`).
- Host emits canonical events (`biteWindowStart`, `hookResult`, `catchResult`, `escapeResult`, `sessionEnd`).
- Sync safety: periodic checksum events and `state_resync` snapshots when mismatch is detected.
- Reconnect/spectate:
  - reconnect within grace window reclaims prior player seat by same player identity.
  - overflow participants beyond active seats are treated as spectators.

## Implementing a New `mpAdapter`

1. Implement `MpAdapter` interface from `src/mp/mpAdapter.ts`.
2. Define input/snapshot/event/result types for the game.
3. Implement host simulation in adapter (`onInput`, `step`, `getSnapshot`).
4. Implement client sync (`applySnapshot`, `applyEvent`).
5. Register descriptor in `src/mp/adapters/index.ts` with mode and schema.
6. In game entry (`src/games/<id>/index.ts`), branch on `hooks.multiplayer` and use multiplayer scene/runtime path.

Contract methods required by all adapters:

- `init()`
- `start()`
- `stop()`
- `onInput()`
- `onRemoteMessage()`
- `getSnapshot()`
- `applySnapshot()`
- `getResult()`

Recommended transport pattern:

- clients send `input` or turn actions only.
- host validates/applies actions and emits canonical `event`.
- host periodically broadcasts `snapshot` for reconciliation.
- clients apply snapshot/event in-order and ignore stale `eventId`.

## Table Tennis Multiplayer

- Status: `FULL MP IMPLEMENTED`
- Model: real-time, host authoritative simulation.
- Host authority: ball physics, paddle collisions, scoring, serve alternation, deuce rules, and match end.
- Network model:
  - players send paddle intent input (`targetX` + `velX`) to host.
  - host simulates fixed timestep and broadcasts snapshots plus match events.
  - clients render with local prediction + reconciliation and snapshot interpolation.
- Player slots:
  - index `0` is bottom paddle.
  - index `1` is top paddle.
  - index `2+` are spectators (view-only).
- Modes:
  - multiplayer supports `quick_match` and `best_of_3`.
  - `practice` remains single-player only.
