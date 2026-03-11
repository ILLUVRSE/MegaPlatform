# Goalie Gauntlet Career Mode

This document defines Career season schemas and deterministic generation rules.

## Determinism Contract

Career seasons are generated from:
- `seasonKey` (ISO week key, e.g. `2026-W07`)
- `profileSeed` (local profile seed)

Generator:
- `generateCareerSeason(catalog, seasonKey, profileSeed)`
- Outputs fixed 12 matches for same inputs.

Notes:
- Structure and objective sequence are deterministic.
- Progress (wins/losses/index/history) is local-only and persisted offline.

## Content Schema

File: `src/content/goalie-gauntlet-career.json`

Root fields:
- `opponentTiers[]`
- `matchTemplates[]` (at least 24)
- `finalsTemplates[]`

### `opponentTiers[]`

- `id`: `bronze | silver | gold | elite`
- `label`: UI display name
- `difficulty`: `easy | medium | hard`
- `ratingBase`: base season rating reward

### `matchTemplates[]` / `finalsTemplates[]`

- `id`
- `name`
- `patternId` (must exist in pattern catalog)
- `opponentTier`
- `shotCount`
- `objective`

Objective variants:
- `save_target`: `savesTarget`
- `goals_under`: `maxGoals`
- `streak_target`: `streakTarget`
- `sudden_death`: `lives`

## Season Progress Persistence

Stored in goalie progression profile:
- `career.currentSeasonKey`
- `career.currentMatchIndex`
- `career.seasonWins`
- `career.seasonLosses`
- `career.seasonHistory[]` (last 5)

Season summary example:
- `seasonKey`
- `completedMatches`
- `wins`
- `losses`
- `ratingEarned`
- `bestStreak`
- `totalScore`
- `completedAtIso`

## Currency and XP Hooks

Per-match rewards are deterministic from performance summary:
- saves/perfect/streak
- completion bonus
- mode bonuses (challenge/ranked/career objective)

Outputs:
- `coins`
- `xp`

## Local Seasonal Ladder

Rating tier mapping:
- `Rookie`
- `Semi-Pro`
- `Pro`
- `All-Star`
- `Legend`

Rating delta formula inputs:
- opponent tier
- objective pass/fail
- goals allowed
- best streak
- perfect rate
- finals bonus

No backend leaderboard is used.

## Cosmetics Schema

File: `src/content/goalie-gauntlet-cosmetics.json`

Per item:
- `id`
- `type` (`mask`, `pads`, `glove`, `stick_tape`, `goal_horn`, `ice_trail`, `crowd_chant`)
- `name`
- `price`
- `unlockRule`
- `preview`

Guarantees:
- cosmetic-only effects
- no timing/scoring/stat changes

## Achievements Schema

File: `src/content/goalie-gauntlet-achievements.json`

Per entry:
- `id`
- `name`
- `description`
- `badge`
- `type`
- `target`
- optional `tier` (for ranked-tier achievements)
