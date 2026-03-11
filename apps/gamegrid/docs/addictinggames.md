# AddictingGames Submission Kit

## Title
GameGrid

## Short Description
GameGrid is a fast digital sports bar with 12 arcade-style sports mini-games and one-click party rooms.

## Long Description
GameGrid combines quick solo play and multiplayer party rooms in one responsive portal. Players can jump into arcade sports instantly or create a room, invite friends with a room code, ready up, and launch synchronized matches. The portal includes accessible theme controls, safe-area support for mobile devices, and embed-friendly behavior for iframe distribution.

## How to Play
1. Open the lobby and choose any game tile.
2. Press Play to launch immediately.
3. Use touch, mouse, or keyboard prompts shown by each game.
4. Keyboard shortcuts: `Esc` pause/resume, `M` mute, `R` rematch.

## Instructions
- For multiplayer, open Party Room, create/join with a room code, then ready up.
- Host can start only after connected players are ready.
- Each game has a tile-level “How to Play” panel with mode-specific tips.

## Dimensions
Responsive / dynamic sizing. The portal and game stage scale to available viewport and safe-area insets.

## Required Asset Paths
- Thumbnail 720x468: `public/thumbnail-720x468.png`
- Video thumb 275x157 MP4 (<= 1MB): `public/video-thumb-275x157.mp4`
- OG image 1200x630: `public/og-image.png`

## Iframe URL Guidance
- Primary URL: `/`
- Optional direct launch URL: `/play/:gameId`
- Test harness: `/embed-test.html`

Recommended iframe attributes:
- `allow="fullscreen; autoplay"`
- responsive width with `aspect-ratio: 16 / 9`

## Zip Packaging Checklist
- `dist/` built from `npm run build`
- required docs included (`docs/embed.md`, `docs/deploy.md`, `docs/addictinggames.md`)
- required assets included under `public/`
- verify `npm run shipcheck` passes before packaging
