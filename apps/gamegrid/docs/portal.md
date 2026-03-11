# Portal Architecture

## Stack
- Vite + React + TypeScript + Phaser
- React Router routes:
  - `/` lobby/home
  - `/play/:gameId` game container
  - `/party` party room
  - `/profile` profile placeholder

## Design System
- Tokenized spacing/radius/shadow/type scale in `src/styles.css`
- Semantic tokens: `--bg`, `--panel`, `--text`, `--muted`, `--accent`, `--danger`, `--success`
- Theme state from `src/systems/settingsContext.tsx` + `src/systems/themes.ts`
- Six skins: Classic Green Felt, Neon Arcade, Midnight, Sunset, Minimal Light, Carbon

## Brand Assets
- `public/brand/logo-mark.svg`
- `public/brand/wordmark.svg`
- `public/favicon.svg` + PNG raster set
- `public/manifest.webmanifest` with maskable app icons

## SVG Icon System
- Raw icons: `src/assets/icons/raw/*.svg`
- Optimized generated icons: `src/assets/icons/generated/*.svg`
- Sprite output: `public/icons/sprite.svg`
- Manifest: `src/assets/icons/manifest.json`

### Add a new icon
1. Add a new raw file in `src/assets/icons/raw/<name>.svg` using 24x24 viewBox and the existing stroke style.
2. Run `npm run icons:build`.
3. Use it in React via `<Icon name="<name>" />`.

## Runtime flow
1. Lobby renders from `src/registry/games.ts`.
2. Navigate to `/play/:gameId`.
3. Audio unlock gate waits for user gesture.
4. Game bundle imports lazily and scene boots.
5. Overlay and iframe bridge stay active for pause/mute/safe-area/end wiring.

## Stability expectations
- Works in cross-origin iframes.
- Refresh-safe deep links with SPA fallback hosting rules.
- Multiplayer routing/session context remains isolated from portal theming/UI.
