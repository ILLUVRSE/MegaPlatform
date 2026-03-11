# What2Watch MVP

What2Watch is a Next.js + Prisma MVP that combines:
- Live trending intelligence with computed `TrendScore`
- Zero-scroll swipe discovery
- Context-rich title detail pages

## Stack
- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma ORM
- API via Next.js Route Handlers
- Anonymous session identity via secure cookie (`w2w_anon`)

## Features implemented
- Home feed sections: `Exploding Now`, `Gaining Momentum`, `New This Week`, optional `Leaving Soon`
- Discover swipe mode with mobile gestures:
  - Right: like + watchlist add
  - Left: dislike
  - Up: detail open
  - Platform/genre/runtime filters for queue generation
- Title detail page with:
  - Availability badges/deep links
  - Ratings (TMDB)
  - Trailer link from TMDB videos
  - Deterministic AI-style summary template
  - Similar titles
  - Headlines (stub/RSS provider)
  - Why trending blurb from TrendScore components
  - 7-day trend sparkline when snapshots exist
- Watchlist add/remove persistence
- Notification event stubs persisted on watchlist changes
- Notification center in nav with unread count + mark-read actions
- SEO pages:
  - `/platform/[platform]`
  - `/genre/[genre]`
  - `robots.txt` + `sitemap.xml`

## Environment
Copy `.env.example` to `.env` and fill values.

## Setup
1. Install deps:
```bash
npm install
```
2. Run DB migration:
```bash
npm run db:migrate
```
3. Generate Prisma client:
```bash
npm run db:generate
```
4. Seed initial data:
```bash
npm run db:seed
```
5. Start app:
```bash
npm run dev
```

## Jobs
Run all data jobs locally:
```bash
npm run jobs:run
```

Or via API:
```bash
curl -X POST "http://localhost:3000/api/admin/run-jobs?secret=$JOB_SECRET"
```

Jobs included:
1. Sync TMDB genres + trending/popular titles
2. Compute/store daily TrendScore snapshots + momentum
3. Refresh availability data (stub provider)
4. Create leaving-soon notification stubs for watchlisted titles

## API routes
- `GET /api/home?region=US&platform=netflix`
- `GET /api/discover/queue?platform=netflix&genre=Drama&runtime=medium`
- `POST /api/interactions`
- `GET /api/title/[type]/[tmdbId]`
- `GET /api/watchlist`
- `POST /api/watchlist`
- `GET /api/notifications`
- `POST /api/notifications` (mark read)
- `POST /api/admin/run-jobs`
- `GET /api/health`

## Screenshots (placeholders)
- `public/screenshots/home.png`
- `public/screenshots/discover.png`
- `public/screenshots/title.png`
- `public/screenshots/watchlist.png`

## Notes
- `AVAILABILITY_PROVIDER=stub` keeps MVP friction-free.
- `NEWS_PROVIDER=stub` is default; set `rss` to enable RSS ingestion.
- Redis is optional; in-memory cache fallback is used by default.
