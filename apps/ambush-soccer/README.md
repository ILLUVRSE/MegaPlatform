# Ambush Soccer

Ambush Soccer is a web-based indoor arena soccer game built with Phaser 3 + TypeScript.

## Modes

- Quick Match vs AI
- Local Versus (2 players on same device)
- Practice mode (no timer)
- Online
  - Quick Match (unranked queue)
  - Private Match (create/join by 6-char lobby code)

## MVP Gameplay Features

- Arena boards with reliable wall rebounds
- Match loop with goal pauses, kickoff resets, overtime golden goal
- Sprint stamina, pass/shoot/tackle, player switch
- AI field players + AI goalie behavior
- HUD + results screen with shots/saves/tackles

## Online Multiplayer (Milestone 3)

- WebSocket-based with lightweight Node server (`server/`)
- Host-authoritative 1v1 for MVP (host simulates authoritative state)
- Client prediction + snapshot reconciliation for non-host
- READY handshake before match start
- Disconnect handling with reconnect grace window (10 seconds)
- Ping display + network soak controls (latency/jitter/drop sliders)

## Tech Stack

- TypeScript
- Phaser 3
- Vite
- Vitest
- ESLint + Prettier
- `ws` (server)

## Install

```bash
npm install
npm --prefix server install
```

## Run (Client + Server Together)

```bash
npm run dev
```

- Vite: `http://localhost:5173`
- WS server: `ws://localhost:8787/ws`

## Build

```bash
npm run build
npm run build:server
```

## Test

```bash
npm test
```

## Controls

### Player 1 (Keyboard)

- Move: `W A S D`
- Sprint: `Shift`
- Pass: `Space`
- Shoot (hold + release): `Ctrl` or `K`
- Switch player: `Tab`
- Tackle/Poke: `C`

### Player 2 (Keyboard local-versus)

- Move: `Arrow Keys`
- Sprint: `Numpad 0`
- Pass: `Numpad 1`
- Shoot (hold + release): `Numpad 2`
- Switch player: `Numpad 3`
- Tackle/Poke: `Numpad 4`

### Gamepad (scaffold)

- Left Stick: move
- RT: sprint
- A: pass
- B: shoot
- LB: switch player
- Y: tackle

## Online Local Testing (Two Windows)

1. Start `npm run dev`.
2. Open two browser windows to `http://localhost:5173`.
3. In each window: Menu -> `Online`.
4. Option A: One chooses `Private Match: Create Lobby`, the other chooses `Private Match: Join Lobby` and enters code.
5. Option B: both choose `Quick Match (Unranked)`.
6. Match starts once both clients are matched and READY.

## Network Soak Testing

In `Online` menu, use the `Network Soak` panel:

- Latency: `0..250ms`
- Jitter: `0..120ms`
- Drop: `0..5%`

These simulate adverse network conditions client-side.

## Environment

Copy `.env.example` if you need a custom WS endpoint.

- `VITE_WS_URL` default resolves to `ws://<host>:8787/ws`

## Structure

- `src/game/scenes`: Boot, Menu, OnlineMenu, Match, Results
- `src/game/systems`: physics/input/match/AI/goalie logic
- `src/game/net`: ws client/session, buffers, reconciliation, drivers, debug overlay
- `src/shared/net`: protocol + serialization
- `server/src`: ws service, lobbies, queue, match session registry, tick loop
- `tests`: deterministic gameplay + networking utility tests

## Notes

- Multiplayer networking is unranked MVP and intentionally host-authoritative.
- Server-authoritative ranked/anti-cheat/MMR is future work.
- Placeholder visuals use primitives to keep gameplay and netcode iteration fast.
