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
