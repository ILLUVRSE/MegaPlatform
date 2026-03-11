# Starlight Chronicles Ships

## Content Files

- `src/content/starlight-chronicles/hulls.json`
- `src/content/starlight-chronicles/cosmetics.json`

## Hull Schema

Each hull entry defines:
- identity: `id`, `name`, `class`, `description`
- stats:
  - `maxHP`
  - `moveSpeed`
  - `fireRate`
  - `damageMult`
  - `scanBonus`
  - `diplomacyBonus`
  - `cargoCapacity`
  - `fleeBonus`
- slot layout:
  - `weaponSlots`
  - `shieldSlots`
  - `utilitySlots`
- unlock rule:
  - `starter`, `credits`, `rank`, or `faction`
  - optional `credits`, `rank`, `faction`, `standing`
- visuals:
  - `skinKey` default
  - `silhouetteKey`

## Cosmetics Schema

Cosmetics categories:
- `skins`
- `decals`
- `trails`

Each cosmetic includes:
- `id`, `name`
- visual field (`color` or `symbol`)
- unlock rule:
  - `starter`
  - `rank`
  - `faction`
  - `weekly-report`
  - `contracts`

## Hull-Aware Fitting

Fitting now depends on active hull slot layout:
- per-hull loadouts are stored in profile (`hullLoadouts[hullId]`)
- switching hull keeps that hull's saved fit
- moving to smaller slot counts trims overflow deterministically
- active hull updates:
  - derived combat stats
  - scan behavior
  - cargo capacity
  - flee behavior

## Co-op Snapshot Fields

Run snapshots include ship context:
- `shipConfig.activeHullId`
- `shipConfig.loadout`
- `shipConfig.cosmetics`
- `shipConfig.cargoCapacity`

Host-side validation rejects invalid hull ids from co-op ship config inputs.
