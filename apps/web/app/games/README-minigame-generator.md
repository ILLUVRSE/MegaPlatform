# AI Mario Party Mini-Game Generator (MVP)

This folder powers the `/games` generator experience: press a button, get a deterministic 30‑second minigame.

## What’s included
- Curated games catalog + community picks on `/games`
- Deterministic `MinigameSpec` + seeded RNG in `apps/web/lib/minigame`
- Canvas runtime (fixed 60fps step, deterministic simulation)
- 6 templates (button mash, dodge, click, timing, collect/escape, arena KO)
- Safe modifiers (visual + gentle mechanical tweaks)
- Seeded generator + mutate/reroll controls
- LocalStorage persistence for last 10 seeds

## Core files
- `apps/web/lib/minigame/spec.ts` — types + validator + param ranges
- `apps/web/lib/minigame/rng.ts` — deterministic RNG + seed helpers
- `apps/web/lib/minigame/runtime/*` — canvas engine + input + collisions
- `apps/web/lib/minigame/templates/*` — template specs + controllers
- `apps/web/lib/minigame/modifiers/*` — safe modifiers
- `apps/web/lib/minigame/generator.ts` — generator / mutate / reroll
- `apps/web/app/games/components/*` — UI + canvas frame

## E2E fast timer
For Playwright tests, set:

```
NEXT_PUBLIC_E2E_FAST_TIMER=1
```

This keeps spec duration at 30s but makes the runtime finish in ~3s for tests.

## Focus + input lock
The canvas wrapper must be focused to capture gameplay keys. While playing and focused:
- Arrow keys/space won't scroll the page
- Trackpad wheel is prevented over the game surface
- Body scroll is locked during active rounds

## Party mode (local multiplayer)
The `/games/party` route adds a hot-seat party flow:
- Lobby with player names, rounds, and party seed
- Round-by-round turns on the same deterministic minigame
- Scoreboard + round history with win/loss tracking

## Catalog embeds + telemetry
- Curated detail pages render an embed iframe at `/games/[slug]` using `/games/embed/[slug]`.
- Creator publish and catalog/embed interactions send telemetry to `POST /api/games/telemetry`.
- Telemetry is persisted in `PlatformEvent` for admin analytics continuity.

## Adding a new template
1. Add a new file in `apps/web/lib/minigame/templates/` with:
   - `buildSpec(seed, difficulty, theme)`
   - `createController(spec)`
2. Add param ranges to `apps/web/lib/minigame/spec.ts`.
3. Register in `apps/web/lib/minigame/templates/index.ts`.
4. Update tests if needed.

## Modifiers
Modifiers are intentionally safe. If a modifier can make a game unwinnable, add a rule in `validateMinigameSpec`.
