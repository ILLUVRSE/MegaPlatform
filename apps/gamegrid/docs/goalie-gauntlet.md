# Goalie Gauntlet

Goalie Gauntlet is a front-view hockey goalie reflex game with deterministic shot schedules, graded save windows, and Party Room host-authoritative multiplayer.

## Core Gameplay

- Defend a 6-zone net map:
  - `high-left`, `mid-left`, `low-left`
  - `high-right`, `mid-right`, `low-right`
- Input:
  - `Swipe/Drag` (default): continuous one-hand zone control
  - `Tap-to-Dive` (accessibility toggle): tap any screen region to snap to nearest save zone
- Advanced saves:
  - `Poke Check` (low-zone tap timing)
  - `Glove Snag` (high-zone hold catch + streak protection)
  - `Desperation Dive` (two-zone sweep, cooldown and miss recovery)
- Every shot has a telegraph (`windup`, `glow`, or both).
- Save grades against shot arrival timing:
  - `PERFECT`: early-tight timing window
  - `GOOD`: standard window
  - `LATE`: valid save but streak break
  - `MISS`: wrong zone or outside window

## Modes

- `Classic Gauntlet` (`survival`)
- `Timed 60s` (`time_attack`)
- `Challenge Ladder` (`challenge`)
- `Ranked Daily` (`ranked`)
- `Career Season` (`career`)

### Career Season

- Deterministic season generation from `seasonKey + profileSeed`.
- 12-match structure with finals at match 12.
- Match objective types:
  - save target
  - goals under threshold
  - streak target
  - sudden death
- Tracks local progression only:
  - `currentSeasonKey`
  - `currentMatchIndex`
  - `seasonHistory` (last 5 recaps)

### Seasonal Ladder (Local)

- Each Career match grants Season Rating.
- Ladder tiers:
  - `Rookie`, `Semi-Pro`, `Pro`, `All-Star`, `Legend`
- Ladder is offline/local only (no global backend leaderboard).

## Data-Driven Content

- Shot patterns:
  - `src/content/goalie-gauntlet-patterns.json`
- Challenges:
  - `src/content/goalie-gauntlet-challenges.json`
- Career season templates:
  - `src/content/goalie-gauntlet-career.json`
- Cosmetics catalog:
  - `src/content/goalie-gauntlet-cosmetics.json`
- Achievements:
  - `src/content/goalie-gauntlet-achievements.json`

## Currency, XP, and Unlocks

- Soft currency: `Crowd Coins`.
- Earned from saves, perfects, streaks, completion, and mode bonuses.
- XP and levels are local progression.
- Reward summary surfaces:
  - coins earned
  - xp earned
  - level progress

No pay-to-win:
- Store purchases are cosmetics only.
- Cosmetics do not change timing windows, shot schedules, or scoring rules.

## Cosmetic Categories

- Masks (colorways)
- Pads skins
- Glove skins
- Stick tape skins
- Goal horn themes
- Ice trail effects
- Crowd chant packs

Store and loadout are offline-first and persist in localStorage.

## Achievements and Badges

- `Perfect 25`
- `No Goals Allowed`
- `Rebound Slayer`
- `Ranked Gold`
- `1000 Saves`

Achievements unlock once and map to badge entries in the local profile.

## Persistence

Stored offline-first in localStorage:
- gameplay stats and best scores
- ranked best/last score and tier
- career season progress/history
- currency and xp/level
- unlocked/equipped cosmetics
- achievements and badges
- settings and accessibility toggles

## Multiplayer / Party Safety

Adapter: `src/mp/adapters/goalie-gauntlet.ts`

- Host-authoritative deterministic shot resolution remains unchanged.
- If Party launch requests `career`, adapter safely falls back to `ranked` to avoid unsupported cooperative progression state.
- Career progression is solo-first; Party sessions stay valid and non-crashing.
