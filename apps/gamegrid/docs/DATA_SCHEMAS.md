# Data Schemas

## Modules (`src/data/starlightModules.ts`)

Fields:

- `id`, `name`, `slot`, `category`, `rarity`
- `powerCost`, `heatPerSecond`
- `damageType`, `damage`, `fireRate`
- `weapon`: `{ pattern, projectileSpeed, spreadDeg, burstCount, burstGapMs, heatPerShot }`
- `stats` (partial ship stat modifiers)
- `affixes[]`
- `signatureTech`

## Perks (`src/data/starlightPerks.ts`)

Fields:

- `id`, `name`, `description`
- `stats` (run-only modifiers)

## Enemies (`src/data/starlightEnemies.ts`)

Fields:

- `id`, `hp`, `speed`, `fireRate`, `bulletSpeed`
- `damageType`, `score`, `contactDamage`
- `resistances` by damage type

## Missions (`src/data/starlightMissions.ts`)

Fields:

- `id`, `name`, `description`
- `waveId`, `difficulty`
- `hasFinalBoss`, `midbossAtSec`
- `finalBossId`, `signatureRewardId`

## Waves (`src/data/starlightWaves.ts`)

Wave fields:

- `id`, `durationSec`, `spawns[]`

Spawn fields:

- `t`, `enemyId`, `count`
- `formation`: `line | v | circle | staggered`
- `pathType`: `straight | sine | zigzag | dive`
- `firePattern`: `aimed | spread3 | burst5 | none`
- `hpScale`, `midboss`

## Bosses (`src/data/starlightBosses.ts`)

- `MIDBOSS_CONFIG`: telegraph, weak window, volley profile
- `PRISM_WARDEN_CONFIG`: phase table keyed by HP threshold including beam, drone, and volley cadence
