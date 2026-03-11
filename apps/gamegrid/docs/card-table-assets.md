# Card Table Assets and Themes

## Soft Currency Disclaimer
Card Table is entertainment only.
No real money, no cashouts, and no real-money gambling mechanics.

## Asset Layout
- `src/assets/cards/svg/`: full SVG deck (`AS.svg`..`2C.svg`) plus jokers and card backs.
- `src/assets/cards/svg/backs/`: back designs (`back-classic`, `back-midnight`, `back-crimson`).
- `src/assets/cards/svg/suits/`: standalone suit icons (`spade`, `heart`, `diamond`, `club`) and `mono/` monochrome variants.
- `src/assets/cards/png/1x/`: raster cards optimized for in-hand speed.
- `src/assets/cards/png/2x/`: higher-resolution raster cards for large displays.
- `src/assets/cards/manifest.json`: card/back variants, dimensions, padding, and theme support metadata.
- `src/assets/card-table/themes/`: felt textures and `manifest.json` for table skins.

## CardRenderer Selection
`src/games/card-table/ui/CardRenderer.ts` is the single renderer path for Card Table UI.

Selection order:
1. `cardFaceStyle = png`: PNG first, then SVG.
2. `cardFaceStyle = svg`: SVG first, then PNG.
3. `cardFaceStyle = auto`: PNG for normal in-round rendering, SVG fallback for scaling and missing PNGs.
4. If neither texture exists, renderer falls back to a simple text card (`AS`, `10H`, etc.).

Card back behavior:
- Face-down cards use selected `cardBackId` from appearance settings.
- Back fallback follows the same texture order.

## Theme System
Theme files:
- `src/games/card-table/theme/themes.ts`
- `src/games/card-table/theme/themeManager.ts`
- `src/games/card-table/theme/useCardTableTheme.ts`

Included themes:
- Classic Green Felt (default)
- Midnight Blue
- Crimson Casino
- Neon Arcade
- Minimal Light

Each theme defines:
- felt/table background direction
- panel/text/accent palette
- default card back id
- reduced-motion preference flag
- optional sound pack hook id

Theme application:
- CSS variables are applied to the Card Table host container (`--ct-bg`, `--ct-panel`, `--ct-accent`, `--ct-text`, `--ct-muted`).
- Card Table scene reads appearance settings and applies themed color treatment for canvas UI.

## Appearance Panel (UI)
Card Table settings includes an Appearance section for:
- Theme
- Card face style (`Auto`, `PNG`, `SVG`)
- Card back picker
- High-contrast cards toggle

These controls are visual-only and do not affect game rules, outcomes, AI, or multiplayer flow.

## Adding a New Theme
1. Add a small seamless texture under `src/assets/card-table/themes/`.
2. Register it in `src/assets/card-table/themes/manifest.json`.
3. Add a new theme object in `src/games/card-table/theme/themes.ts` with palette + default back id.
4. Ensure text contrast remains readable on mobile and desktop.

## Adding a New Card Back
1. Add `back-<id>.svg` in `src/assets/cards/svg/backs/`.
2. Add matching PNGs in `src/assets/cards/png/1x/` and `src/assets/cards/png/2x/`.
3. Register the back in `src/assets/cards/manifest.json`.
4. Add it to the appearance picker cycle in `src/games/card-table/scene.ts`.

## Performance Notes
- 1x PNGs are used as default for fast in-game hands.
- SVGs are available for scaling and visual fallback.
- Selected card back assets are preloaded at mode start/settings apply.
- Texture files are lightweight and theme textures stay under the intended size budget.
