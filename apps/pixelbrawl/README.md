# PixelBrawl

Mobile-first 1v1 lane fighter presentation layer with engine/render separation.

## Run

Primary (requires dependencies):

```bash
npm install
npm run dev
```

Fallback static serve (for module loading):

```bash
python3 -m http.server 8080
```

## Architecture

- `src/engine/GameEngine.js`
  - Owns rules, movement, hit logic, lanes, AI.
  - Produces read-only `GameState` snapshots (`getSnapshot`).
- `src/render/*`
  - Stage, fighters, HUD, VFX, audio, input.
  - Consumes snapshot only. No direct mutation of engine internals.

## GameState Snapshot Shape

```js
{
  timeMs, roundTimer, round, paused,
  p1: { name, health, maxHealth, lane, x, y, facing, state, comboCount, meter, isBlocking, rounds },
  p2: { ... },
  events: [{ type, atMs, data }],
  debug: { enabled, hitboxes, hurtboxes, lanes }
}
```

## Controls

- Keyboard: `WASD` + `J/K/L`, `H` toggles debug.
- Mobile:
  - Left virtual stick: move + up/down lane
  - Flick up/down: sidestep lane dash
  - Right buttons: `HIT`, `POWER`, `GUARD`

Hidden inputs:
- `HIT + POWER`: throw
- `Down + HIT`: low poke
- `Forward + POWER`: launcher
- `Down + POWER`: sweep
- `Flick + POWER`: sidestep strike

## Assets

Stable drop-in paths created:
- `src/assets/stages/neon-dojo/layer0.png ... layer3.png`
- `src/assets/fighters/<name>/atlas.png, atlas.json`
- `src/assets/ui/*`
- `src/assets/audio/music/*`
- `src/assets/audio/sfx/*`

Procedural placeholders are used if production assets are missing.

## Notes

- Pixel rendering: nearest-neighbor canvas style enabled.
- Debug overlay includes lane guides + hitbox/hurtbox outlines.
- Audio unlock is gesture-gated from the Tap to Start button.
- No external links/tracking included.
