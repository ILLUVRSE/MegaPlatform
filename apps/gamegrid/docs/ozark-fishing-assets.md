# Ozark Fishing Visual Assets

## Fish Atlas
- `public/ozark/fish-atlas.png`
- `public/ozark/fish-atlas.json`

The atlas keys follow `fish-{silhouette}-{state}` where:
- silhouette: `bass | panfish | catfish | gar | trout | walleye | carp | muskie | paddlefish`
- state: `idle | bite | thrash | exhausted`

## Fish Visual Definitions
- `src/content/ozark-fish-visuals.json`

Format per species id:
- `baseColors`: `[hex, hex]`
- `patternAccents`: `[hex, hex]`
- `silhouette`
- `spriteKeys.idle|bite|thrash|exhausted`
- `animSpeed.idle|bite|thrash|exhausted`
- `sizeScaleByPercentile.p10|p50|p90|p95`
- `rarityEffects.aura`: `none | mist | gold`

## Cosmetics Format
- `src/content/ozark-cosmetics.json`

Top-level keys:
- `bobberSkins[]`
- `lureSkins[]`

`bobberSkins[]` fields:
- `id`, `name`
- `style`: `split | ring | dot | stripe`
- `primaryColor`, `secondaryColor`, `ringColor`
- `unlock.type`: `level | challenge | season_reward`
- `unlock.value`: number or string

`lureSkins[]` fields:
- `id`, `name`
- `lureTags[]`
- `palette`: `[hex, hex]`
- `unlock.type`, `unlock.value`

## Adding A New Fish Skin
1. Add an entry to `src/content/ozark-fish-visuals.json` keyed by fish id.
2. Point `spriteKeys` to atlas keys in `public/ozark/fish-atlas.json`.
3. Keep color values as 6-digit hex strings.
4. Run `npm test` and `npm run shipcheck`.

## Environment Composition Assets
- `src/content/ozark-environment-visuals.json`
- `src/games/ozark-fishing/sceneCompose.ts`

Public art paths:
- `public/ozark/env/silhouettes/*.svg`
- `public/ozark/env/props/*.svg`
- `public/ozark/env/sky/*.svg`
- `public/ozark/env/clouds/*.svg`
- `public/ozark/env/particles/*.svg`
- `public/ozark/env/previews/*.svg`

Spot signatures used by composer:
- Cove: `lily_pad`, `reeds`, `cattail`
- Dock: `dock_post`, `rope_float`, `rock`
- Open Water: `island`, `wave_band`, `rock`
- River Mouth: `current_streak`, `driftwood`, `reeds`

Composer rules:
- Deterministic placement is derived from `sessionSeed + spot + season + weather + time`.
- No runtime `Math.random` is used for environment placement/variant selection.
- Layer budget is bounded (`MAX_OBJECTS`) and quality-scaled for mobile safety.
