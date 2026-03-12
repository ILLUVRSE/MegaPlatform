# ILLUVRSE Web Shell (Monorepo)

Primary Next.js shell for ILLUVRSE. Includes:

- Home feed + social wall
- Watch, Games, Party, Studio
- Admin module at `/admin` (RBAC, CRUD, reports, audit)
- Unified launch routes for integrated apps:
  - `/news`
  - `/gamegrid`
  - `/pixelbrawl`

## Stack
- Next.js App Router (React 19, TypeScript)
- Prisma + Postgres (centralized in `packages/db`)
- NextAuth Credentials provider (dev only)
- TailwindCSS + `@illuvrse/ui` tokens
- Vitest + Playwright

## Environment Variables
Create `.env` in `apps/web` (see `.env.example`):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/illuvrse_admin?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-string"
AUDIT_ADAPTER="db"
```

## Local Postgres (Docker)
If port 5432 is busy, use 5433:

```
docker run --name illuvrse-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=illuvrse_admin -p 5433:5432 -d postgres:16
```

## Setup (Monorepo Root)
```
pnpm install
pnpm --filter @illuvrse/db prisma:generate
pnpm --filter @illuvrse/db prisma:migrate -- --name init
pnpm --filter @illuvrse/db prisma:seed
pnpm dev
```

Open `http://localhost:3000`.

Unified platform run mode from repo root:

```
pnpm run dev:platform
```

This launches core shell + integrated News/GameGrid/PixelBrawl apps together.

### Admin Login
Use the seeded account on `/auth/signin`:
- Email: `admin@illuvrse.local`

A non-admin seed user is also created:
- Email: `user@illuvrse.local`

## RBAC Notes
- All `/admin` pages and `/api/admin` routes are protected by middleware + `requireAdmin`.
- Server-side enforcement checks `session.user.role === "admin"`.
- Role assignment stores a string on `User.role`; the `Role` table is managed separately for permissions and can be wired to enforcement later.

## Audit Adapter
Audits are written through an adapter (`packages/audit`). Default is DB-backed via `AdminAudit`.

Switch to console forwarding:
```
AUDIT_ADAPTER=console
```

To forward to a central logging sink, replace `createConsoleAuditAdapter` with an OTEL/ELK client and document credentials there.

Example SQL:
```
select admin_id, action, details, created_at
from "AdminAudit"
order by created_at desc
limit 20;
```

## Upload Stubs
Studio uses the signed upload flow in `apps/web/lib/uploads.ts` via `/api/uploads/sign` and `/api/uploads/finalize`.
The legacy raw `data:` upload endpoint at `/api/storage/upload` is deprecated.

TODO plan:
1. Enforce lifecycle promotion from temporary uploads to published media records.
2. Invalidate CDN cache on update/delete flows.
3. Add operational accounting around storage usage and retention.

## Tests
Unit tests:
```
pnpm --filter @illuvrse/web test
```

Coverage:
```
pnpm --filter @illuvrse/web exec vitest run --config tests/vitest.config.ts --coverage
```

Playwright (local):
```
# Terminal 1
pnpm dev

# Terminal 2
pnpm --filter @illuvrse/web test:e2e
```

If your system lacks Playwright deps, run in Docker:
```
docker run --rm --network host -v $(pwd)/apps/web:/work -w /work mcr.microsoft.com/playwright:v1.58.2-jammy /bin/bash -lc "corepack enable && pnpm test:e2e"
```

## Defaults & UX
- Pagination: page size 20
- Search: case-insensitive matching on title/slug
- Sorting: `createdAt DESC`

## Decisions & Tradeoffs
- Credentials auth for local dev only; production should use platform SSO.
- Uploads are stubbed; see TODO plan above.
- Audit adapter defaults to DB; can be forwarded to centralized logging.
