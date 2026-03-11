# Watch Platform

## Routes
- `/watch` — streaming home with hero + rails
- `/watch/show/[slug]` — show detail page with seasons + episodes
- `/watch/episode/[id]` — episode playback
- `/watch/movies` — movies stub
- `/watch/live` — live channels grid
- `/watch/live/[channelId]` — live channel playback

## Data Model
- `Show`, `Season`, `Episode` already exist for on-demand content.
- `LiveChannel` + `LiveProgram` provide live TV catalog + EPG.
- `Show.isPremium` + `Show.price` drive baseline premium gating.
- `Show.maturityRating` + `Profile.isKids` drive kids-profile restrictions.

## Seeding
Run:
```bash
pnpm --filter @illuvrse/db prisma:seed
```
Seed inserts:
- 3 shows with seasons + episodes
- 6 live channels + now/next programs

## Adding Channels
1. Insert a `LiveChannel` row with `streamUrl` pointing to an HLS manifest (`.m3u8`).
2. Add `LiveProgram` rows for EPG (optional but recommended).

## HLS Notes
- Player uses hls.js for `.m3u8` and native video for MP4.
- If streams are offline, the player shows a retry overlay.
- Public test streams can be unreliable—swap with your own streams for production.

## TODO
- Real payment-backed entitlements and DRM enforcement.
- Live channel management UI in Admin.
