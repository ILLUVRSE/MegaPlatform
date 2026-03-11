# Ozark Fishing LiveOps (Local-First)

## Deterministic Principles
- No backend required.
- Current season is resolved from UTC date/month mapping.
- Current weekly event is resolved from ISO week key (`YYYY-Www`) + deterministic hash.
- Party sessions lock season/event keys into host session config for fairness.

## `src/content/ozark-seasons.json`
Top-level object:
- `dateMapping`: month arrays by season id (`spring|summer|fall|winter`)
- `seasons[]` entries:
- `id`, `name`
- `fishBoosts`: fish multiplier map
- `weatherOdds`: `{ sunny, overcast, light_rain }`
- `visualTheme`: `{ tint, particle }`

## `src/content/ozark-events.json`
Array of weekly event definitions:
- `id`, `name`, `description`
- `fishBoosts`
- `biteRateMultiplier`
- `rarityOddsMultiplier`
- optional:
- `nightMultiplier`
- `weatherRequired`
- `weatherOverrides`
- `zoneBoosts`
- `scoring` (`bigCatchBonus`, `derbyWeightBonus`, `durationSecOverride`)

## `src/content/ozark-legendaries.json`
Array of limited-time legendary rules:
- `legendaryId`, `name`
- `requiredSeasons[]`
- `requiredEvents[]`
- `spawnOdds`
- `behaviorTags[]`

## Season Standings Persistence
Stored in `progression.seasons[]`:
- `seasonId`
- `weeklyRecords[]` with
- `weekKey`
- `bestDerbyWeightLb`
- `bestBigCatchLb`
- `raresCaught`
- `earnedRewards[]` (cosmetic identifiers only)
