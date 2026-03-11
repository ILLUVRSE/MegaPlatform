# Deploy Guide (Static Hosting)

GameGrid is an SPA with deep links (`/play/:gameId`). Configure rewrite fallback to `index.html`.

## Build
- `npm run icons:build`
- `npm run assets:render`
- `npm run build`

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Redirect rule: `/* /index.html 200`

## Vercel
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Rewrite fallback to `index.html`

## Cloudflare Pages
- Build command: `npm run build`
- Build output directory: `dist`
- Add SPA fallback rules for unknown routes.

## Deep-link validation
After deploy, test:
- `/`
- `/play/pixelpuck`
- `/party`
- refresh directly on `/play/:gameId`

## Portal Asset Validation
Confirm these are present in build package/static host:
- `/thumbnail-720x468.png`
- `/video-thumb-275x157.mp4`
- `/og-image.png`
- `/manifest.webmanifest`
