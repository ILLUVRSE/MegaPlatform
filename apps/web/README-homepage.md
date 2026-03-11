# ILLUVRSE MegaPlatform Homepage

## Routes
- `/` — MegaPlatform homepage (watch, shorts, games, party hub).
- `/shorts` — Shorts feed (stubbed).
- `/watch` — Premiere/ticketing surface (stubbed).
- `/games` — Instant games grid (stubbed).
- `/games/[slug]` — Game detail/embed placeholder (stubbed).
- `/party` — Party Core (real).
- `/show/[slug]` — Show detail page (real, DB-backed).
- `/studio` — Creator studio (stubbed).
- `/about` — Marketing overview (stubbed).

## Real vs Stubbed
- Real:
  - Shows + seasons + episodes from Postgres (Prisma).
  - Party Core (seat lobbies, playback, playlist builder).
- Stubbed:
  - Shorts feed data (`apps/web/app/shorts/data.ts`).
  - Games catalog (`apps/web/app/games/data.ts`).
  - Watch/ticketing and Studio surfaces.

## Development
### Postgres (required for Shows + Party)
```bash
docker run --name illuvrse-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=illuvrse -p 5433:5432 -d postgres:16
```

### Redis (required for Party world-state)
```bash
docker run --name illuvrse-redis -p 6379:6379 -d redis:7
```

### Environment
Create `.env` based on `.env.example`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/illuvrse?schema=public"
```

### Run
```bash
pnpm install
pnpm --filter @illuvrse/db prisma:generate
pnpm --filter @illuvrse/db prisma:migrate
pnpm --filter @illuvrse/db prisma:seed
pnpm dev
```

## Playwright (Linux sandbox)
Playwright is configured with `--no-sandbox` and `--disable-setuid-sandbox` in `apps/web/tests/e2e/playwright.config.ts` to avoid Chromium sandbox issues in Linux.
## Next Steps
- Shorts ingestion + transcoding pipeline.
- Ticketing + event scheduling for premieres.
- Game embed runtime + leaderboards.
- Admin tooling for homepage content.
