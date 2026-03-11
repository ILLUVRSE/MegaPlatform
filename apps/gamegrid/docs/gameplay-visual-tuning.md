# Gameplay + Visual Tuning (Cross-Game Pass)

This pass standardizes render/input shell behavior and upgrades each game's visual baseline color.

## Shared Gameplay Tuning

- All games now use a shared shell with:
  - `fps.target` tuned per game (120 or 144 depending on pace)
  - `fps.min = 30`
  - `fps.smoothStep = true` for steadier frame pacing
  - `input.activePointers = 3` for more reliable touch interactions

## Shared Visual Tuning

- All games now initialize through one visual shell with:
  - per-game curated `backgroundColor`
  - consistent anti-alias render defaults

## Per-Game Changes

- `pixelpuck`: gameplay `targetFps=144`, visual `#041521`
- `throw-darts`: gameplay `targetFps=120`, visual `#131218`
- `minigolf`: gameplay `targetFps=120`, visual `#0a1c1c`
- `freethrow-frenzy`: gameplay `targetFps=120`, visual `#121220`
- `homerun-derby`: gameplay `targetFps=120`, visual `#181327`
- `table-tennis`: gameplay `targetFps=144`, visual `#10263d`
- `foosball`: gameplay `targetFps=144`, visual `#0d2318`
- `pool`: gameplay `targetFps=120`, visual `#082619`
- `card-table`: gameplay `targetFps=120`, visual `#162033`
- `penalty-kick-showdown`: gameplay `targetFps=120`, visual `#102712`
- `goalie-gauntlet`: gameplay `targetFps=120`, visual `#0b1c34`
- `alley-bowling-blitz`: gameplay `targetFps=120`, visual `#1c1e2f`
