# PixelPuck (Air Hockey)

## Architecture
- `scene.ts`: Single-player scene. Owns HUD, menus, effects, and match flow. Uses fixed-step simulation with render interpolation.
- `multiplayerScene.ts`: Multiplayer client/host scene. Runs fixed-step host sim, interpolates client snapshots, handles ready + reconnect hooks.
- `physics.ts`: Continuous collision detection (CCD) for puck vs paddles/rails/goals/obstacles. Emits impacts and goal events.
- `input.ts`: Pointer tracking, smoothing, sticky bias, and acceleration-limited paddle motion.
- `quality.ts`: DPR cap and auto-quality tuning based on FPS samples.
- `settings.ts`: PixelPuck-specific settings persisted to localStorage (v2).

## Settings
Stored in `gamegrid.pixelpuck.settings.v2`.

- `mode`: `first_to_7` | `timed` | `practice`
- `difficulty`: `easy` | `medium` | `hard`
- `sensitivity`: `low` | `medium` | `high`
- `assist`: soft boundary guidance (boolean)
- `powerSmash`: swipe-to-smash (boolean)
- `soundOn`: local SFX toggle (boolean)
- `haptics`: local vibration toggle (boolean)
- `effects`: `high` | `low` | `off`
- `autoQuality`: auto adjust effects/DPR when FPS drops (boolean)
- `dprCap`: max DPR (1.25–2.25)
- `screenShake`: impact shake (boolean)
- `trail`: puck trail (boolean)
- `spin`: apply tangential spin from paddle velocity (boolean)
- `smoothing`: pointer smoothing (0–0.8)
- `sticky`: sticky bias toward finger (0–0.8)
- `oneHanded`: mirror HUD left/right (boolean)
- `oneHandedSide`: `left` | `right`
- `tutorialSeen`: tutorial overlay completion flag (boolean)

## Performance
- Fixed timestep: 60Hz.
- No per-frame allocations in hot loops; particle/trail pools are reused.
- `QualityTuner` caps DPR and auto-reduces effects/DPR on sustained low FPS.

## Tests
- `physics.test.ts`: CCD regression tests for rail/paddle/goal high-speed hits.
