# Sortie Tuning

## Core Feel Constants

From `src/util/starlightConstants.ts` and live usage in `src/scenes/Sortie.ts`:

- `fixedDt`: `1/60`
- `accel` (base): `390`
- `damping` (base): `0.34`
- `idleDampingBoost`: `0.22`
- `maxSpeed` (base): `265`
- `turnRate` (base): `7`
- `blinkCooldown` (base): `5s`
- `blinkDistance` (base): `130`
- `fireRate` (base primary): `6`
- `projectileSpeed` (base): `430`
- `heatCapacity` (base): `100`
- `heatDissipation` (base): `24/s`
- `overheatFirePenalty`: `0.5` (50% ROF loss when overheated)
- `shieldRegenDelay` (base): `2.8s`

## Weapon Tuning

Weapon behavior is data-driven in `src/data/starlightModules.ts` via `weapon` fields:

- `pattern`: `pulse | scatter | missile | burst`
- `projectileSpeed`
- `spreadDeg`
- `burstCount`
- `burstGapMs`
- `heatPerShot`

Primary/secondary modules also tune damage type, damage, and fire rate.

## Wave/Boss Tuning

- Wave scripts: `src/data/starlightWaves.ts`
- Mission metadata: `src/data/starlightMissions.ts`
- Designer JSON examples:
- `src/data/waves/sector1.json`
- `src/data/missions/sector1.json`

Each spawn supports:

- `t`, `enemyId`, `count`
- `formation`: `line | v | circle | staggered`
- `pathType`: `straight | sine | zigzag | dive`
- `firePattern`: `aimed | spread3 | burst5 | none`
- `hpScale`
- `midboss`

Prism Warden timings are in `updatePrismWarden()` in `src/scenes/Sortie.ts`.

## Practical Tuning Workflow

1. Adjust module weapon stats in `starlightModules.ts` to shape player feel.
2. Adjust per-enemy speed/fire in `starlightEnemies.ts` to set pressure.
3. Adjust spawn cadence and formation layering in `starlightWaves.ts`.
4. Use debug keys in Sortie to test quickly:
- `F6` spawn midboss
- `F7` skip to final boss
- `I` toggle invulnerability
- `` ` `` toggle dev overlay
