# ILLUVRSE Platform Unification

The platform is now consolidated under one monorepo root:

- `apps/web` (core ILLUVRSE shell and primary Next.js app)
- `apps/news` (news API/workers/web)
- `apps/gamegrid` (game catalog app)
- `apps/pixelbrawl` (fighter app)
- `apps/art-atlas` (cultural discovery app: artists, eras, movements, media)

## Run Modes

From repo root:

```bash
pnpm run dev:core
```

Runs only the core ILLUVRSE shell (`apps/web`).

```bash
pnpm run dev:platform
```

Runs core + News + GameGrid + PixelBrawl + Art Atlas in parallel.

## Local Ports

- Core shell: `http://localhost:3000`
- News app: `http://localhost:3001`
- GameGrid: `http://localhost:5173`
- PixelBrawl: `http://localhost:5174`
- Art Atlas: `http://localhost:3002` (recommended)

Core shell routes:

- `/apps`
- `/news`
- `/gamegrid`
- `/pixelbrawl`

Each route provides both an in-shell embed and a direct-open button.

External embed UX standard (Phase 10):

- Shared metadata contract: `name`, `category`, `tagline`, `route`, `url`
- Standardized shell chrome for all embedded apps (badge row, title, tagline, description, direct launch, copy launch URL)
- Consistent loading treatment for iframe-based embedded modules
- Telemetry parity on embedded surfaces (`module_open` for in-shell entry, `module_open_direct` for external launch)

Module metadata (nav + hub + external launch config) is centralized in:

- `apps/web/lib/platformApps.ts`

Platform launch telemetry endpoint:

- `POST /api/platform/events`

Admin analytics dashboard:

- `/admin/platform`
- Time range filters: `24h`, `7d`, `30d`
- Includes top modules, top surfaces, top destination hrefs, and a daily trend chart
- CSV export: `/api/admin/platform/events/export?range=24h|7d|30d` (admin-only)

Database migration for telemetry table:

- `packages/db/migrations/20260302100000_platform_events/migration.sql`

## Environment

The root `.env.example` now includes:

- `ILLUVRSE_NEWS_URL`
- `ILLUVRSE_GAMEGRID_URL`
- `ILLUVRSE_PIXELBRAWL_URL`
- `ILLUVRSE_ART_ATLAS_URL`

Override these when targeting non-local deployments.
