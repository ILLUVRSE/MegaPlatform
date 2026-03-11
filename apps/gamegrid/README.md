# Starlight Chronicles Vertical Slice

Phaser 3 mobile-first vertical-scroller slice with persistent fitting + run perks.

## Full Loop

1. Main Menu
2. Hangar (persistent fitting)
3. Mission Select
4. Perk Pick (run-only, choose 1 of 3)
5. Sortie
6. Results (loot/salvage/confirm rewards)
7. Back to Hangar / Mission Select

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Shipcheck:

```bash
npm run shipcheck
```

## Controls

- Touch: drag on left half for joystick movement.
- Touch: hold on right half to fire primary.
- Touch: `BLINK` button for ability.
- Touch: `SEC` button for secondary (if equipped).
- Desktop movement: `WASD` or arrows.
- Desktop actions: `Space` fire, `Shift` blink, `E` secondary.
- Debug: `~` dev overlay, `F6` midboss, `F7` final boss, `I` invulnerable, `G` god mode, `L` loot, `M` mute.

## Data Authoring

Primary gameplay data lives in `src/data/`:

- `starlightModules.ts`
- `starlightPerks.ts`
- `starlightEnemies.ts`
- `starlightMissions.ts`
- `starlightWaves.ts`
- `starlightBosses.ts`

Designer JSON examples:

- `src/data/missions/sector1.json`
- `src/data/waves/sector1.json`

## Adding Content

- Add modules/perks/enemies in their data files.
- Add mission metadata in `starlightMissions.ts` and match wave IDs in `starlightWaves.ts`.
- Validate by running `npm run shipcheck`.

## Save Schema (localStorage)

Key: `gamegrid.starlight-chronicles.vertical-slice.v1`

- `version`
- `credits`
- `materials`
- `inventory`
- `equippedSlots`
- `unlocks`
- `bossKills`
- `settings`
- `activeRun`
