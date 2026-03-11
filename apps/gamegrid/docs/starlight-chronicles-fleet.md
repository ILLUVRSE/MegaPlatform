# Starlight Chronicles Fleet Ops

## Content Files

- `src/content/starlight-chronicles/wingmen.json`
- `src/content/starlight-chronicles/drones.json`
- `src/content/starlight-chronicles/escort-missions.json`

## Wingmen Schema

Each wingman includes:
- `id`, `name`, `factionAffinity`
- `role`: `Fighter` | `Support` | `Interceptor`
- `rarity`: `common` | `uncommon` | `rare`
- `passive` (small bonus identity)
- `behavior` (`targeting`, `aggression`)

Deterministic recruitment offers are generated from:
- `profile.seedBase`
- current `systemId`
- UTC `dayKey`

Players can assign up to 2 active wingmen.

## Drone Schema

Each drone includes:
- `id`, `name`, `type`, `rarity`
- `effects` (small support values)

Supported drone effect fields:
- `postCombatHullRepair`
- `shieldBonus`
- `scanBonus`
- `contrabandDetectionReduction`
- `convoyHpBonus`

Only one drone can be active at once.

## Patrol Model

`src/games/starlight-chronicles/world/patrols.ts`

Patrol presence is deterministic from:
- profile seed
- system id
- week key
- system security tier

Patrol choices:
- `assist`: positive standing change, negative risk modifier
- `avoid`: no standing change, neutral risk modifier
- `ambush`: standing penalty, positive risk modifier

## Escort Rules

`ESCORT` is a run node type that resolves deterministic convoy pressure over 2-3 micro-waves.

Failure conditions:
- convoy HP reaches `0`
- simulated route time exceeds mission time limit

Success outcomes:
- credits/materials payout
- faction standing gain
- XP gain

Failure outcomes:
- reduced payout
- ship condition penalty

## Co-op Snapshot Fields

Run snapshots include fleet context in `shipConfig`:
- `activeWingmenIds`
- `activeDroneId`
- `patrolContextIds`

Co-op host validates ship config updates:
- wingmen IDs must exist and be owned
- drone ID must exist and be owned
- invalid IDs emit `input_rejected`

Escort co-op combat also includes shared convoy objective fields:
- `combat.isEscortMission`
- `combat.convoyMaxHp`
- `combat.convoyHp`
