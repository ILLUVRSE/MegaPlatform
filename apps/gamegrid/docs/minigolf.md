# Minigolf

## Controls (Touch + Mouse)
- Press and drag to aim.
- Pull back to set shot power.
- Release to shoot.
- Pointer capture is held until release for stable aiming.
- Optional assist:
  - Tiny drags are stabilized.
  - Aim can snap near cardinal/diagonal angles.
  - Preview line shows first collision plus first-bounce estimate.

## Modes and Scoring
- `Stroke` (default)
  - Track strokes per hole.
  - End-of-hole card shows strokes vs par.
  - End-of-course summary shows total strokes, total par, best/worst holes, and per-hole line items.
- `Time Attack`
  - Global timer counts upward.
  - Stroke penalty policy: each stroke adds `+2.0s`.
  - Final result uses `elapsed time + penalties`.
- `Ghost`
  - Per-hole ghost records sampled ball positions over time.
  - Best run per hole (fewest strokes, then fastest time) is stored and replayed.
  - Optional `Race Ghost` overlay shows live delta time against ghost replay.

## Options
Pre-match menu includes:
- Mode: `Stroke` / `Time Attack` / `Ghost`
- Course: `All 18` / `Classic` / `Neon Arcade` / `Backyard`
- Practice toggle and hole selector
- `Sensitivity`: low / medium / high (power scaling)
- `Preview Line` toggle
- `Ball Cam` toggle
- `Assist` toggle
- `Race Ghost` toggle

## Physics Model
- Ball simulation uses a fixed timestep (`1/120s`) with bounded frame substeps.
- Sleep uses hysteresis:
  - enter sleep when linear + angular velocity remain below enter thresholds for consecutive frames
  - wake threshold is higher than enter threshold to avoid jitter loops
- Friction model:
  - rolling friction and sliding friction are separate
  - sand increases both friction terms
  - ice lowers both friction terms
- Collisions:
  - segment/rect/circle resolution projects out of penetration
  - bounce impulse does not add kinetic energy
  - collision substeps reduce tunneling through thin geometry
- Slope model:
  - slope acceleration comes from JSON zones
  - optional sampled vector fields are supported per slope zone (`sampleCols`, `sampleRows`, `sampleForces`)
  - acceleration is smoothly blended near slope edges
  - final slope acceleration is clamped by config (`maxSlopeAccel`)

## Materials and Hazards
- Surface materials:
  - `normal`
  - `sand`
  - `ice`
- Water hazard handling:
  - entering water adds one stroke penalty
  - respawn uses last safe rest checkpoint (not per-frame updates)
  - respawn resolver searches nearest legal non-hazard, non-wall-clearance point

## Ghost Recording and Replay
- Recorder samples at fixed rate (`20Hz` by default).
- Sampling uses catch-up loops, so long frames still capture deterministic time-spaced points.
- Replay uses time interpolation between samples for smooth motion.
- Storage key: `gamegrid.minigolf.ghosts.v1`.
- Primary storage mode: best run per hole.

## Multiplayer (Party Room)
- Minigolf adapter mode is turn-based (`isTurnBased = true`).
- Host authoritative behavior:
  - only host processes stroke inputs
  - host validates current player turn and input payload
  - host replays each shot with the deterministic minigolf sim before accepting it
  - host computes canonical end-of-stroke result and broadcasts it
- Canonical stroke result event includes:
  - final ball positions
  - per-player strokes
  - per-player penalties
  - cumulative totals
  - next player turn
- Desync protection:
  - host emits periodic lightweight checksum events
  - client compares local checksum
  - on mismatch report, host emits full state resync snapshot

## Server-side Validation & Replay
- Host validation flow:
  - clamp incoming `power`, `angle`, `endX`, and `endY`
  - run `simulateShotForServer(...)` against the current hole using `stepFixedSimulation`, `DEFAULT_PHYSICS_CONFIG`, and the shared collision tuning path
  - compare the server-computed final ball position against the client-declared endpoint
- Validation tolerance:
  - current default is `8px`
  - shots beyond tolerance are rejected and logged for later telemetry tuning
  - TODO: tune tolerance after enough live mismatch samples are collected
- Resync behavior:
  - invalid shots, out-of-bounds declarations, or replay mismatches do not emit `stroke_result`
  - host emits `state_resync` immediately with the authoritative snapshot instead
  - clients should treat repeated checksum mismatches as a signal to inspect local replay drift
- Deterministic replay tests:
  - `pnpm --filter @illuvrse/gamegrid test -- --run "minigolf.replay.test.ts"`
  - `pnpm --filter @illuvrse/gamegrid test -- --run "games/minigolf/physics.test.ts"`

## Level JSON Format
File: `src/content/minigolf-holes.json`

Each hole entry:
- `id`, `name`, `theme`, `par`
- `bounds`
- `start`
- `cup` (`x`, `y`, `radius`)
- `walls` (segment list)
- `bumpers` (`circle` or `rect`)
- `hazards`
  - `water` (`rect` or `polygon`)
  - `surfaces` (`rect` with `material` = `normal|sand|ice`)
  - `slopes` (`rect` with `forceX`, `forceY`, optional sampled field)
- `movingObstacles` (rect blockers with axis/range/speed/phase)

Loader validations enforce:
- exactly 18 holes and 6 holes per theme
- walls in-bounds and non-degenerate
- cup/start in-bounds and cup not inside water/wall clearance
- basic reachability sanity from start to cup on a coarse grid
