# Ozark Fishing Content Formats

## `src/content/ozark-fish.json`
Array of fish definitions.

Required fields:
- `id`: string
- `name`: string
- `rarityTier`: `Common | Uncommon | Rare | Legendary`
- `rarity`: number (weighted roll index)
- `minWeightLb`, `maxWeightLb`: number
- `weightCurve`: `{ p10, p50, p90 }`
- `difficulty`: number
- `fightStyle`: `runner | thrasher | diver | tanker`
- `preferredSpots`: array of spot ids
- `preferredDepths`: array of `shallow | mid | deep`
- `preferredWeather`: array of `sunny | overcast | light_rain`
- `preferredTimes`: array of `day | night`

## `src/content/ozark-lures.json`
Array of lure definitions.

Required fields:
- `id`, `name`
- `sinkRate`, `biteMultiplier`, `detectability`
- `preferredDepth`: `shallow | mid | deep`
- `depthBehavior`: string descriptor
- `speciesAffinity`: record `{ [fishId]: multiplier }`

## `src/content/ozark-gear.json`
Object with arrays:
- `rods[]`: `id`, `name`, `tier`, `unlockLevel`, `flexDamping`, `hookForgiveness`, `tensionControl`
- `reels[]`: `id`, `name`, `tier`, `unlockLevel`, `dragStability`, `reelSpeed`, `slackRecovery`
- `lines[]`: `id`, `name`, `tier`, `unlockLevel`, `snapThreshold`, `visibility`, `abrasionResistance`

## `src/content/ozark-spots.json`
Array of spot definitions.

Required fields:
- `id`: `cove | dock | open-water | river-mouth`
- `name`, `description`, `unlockLevel`
- `zoneWeights`: shoreline/weed/open/deep multipliers
- `depthProfile`: shallow/mid/deep multipliers
- `fishSpawnBoosts`: record of fish-specific multipliers

Optional fields:
- `weatherBoosts`
- `timeBoosts`

## `src/content/ozark-challenges.json`
Array of challenge templates.

Required fields:
- `id`, `name`, `description`
- `kind`: `catch_count_spot | catch_rare_time | land_runner_clean | catch_total_weight | spot_variety | land_trophy_weight`
- `targets[]`: numeric targets by difficulty tier
- `xpReward[]`: XP rewards aligned to target tiers

Daily runtime challenges are generated deterministically from:
- UTC date key (`YYYY-MM-DD`)
- date seed hash
- template slot index

## `src/content/ozark-fish-visuals.json`
Object keyed by `fishId` with visual-only species presentation data:
- color palette
- silhouette family
- atlas sprite keys
- animation speeds
- percentile size scaling
- rarity aura flags

## `src/content/ozark-cosmetics.json`
Visual-only cosmetic catalog:
- `bobberSkins[]`: bobber style/color/unlock data
- `lureSkins[]`: lure palette/unlock data
