# Shipcheck Fix Plan

Current state: `pnpm shipcheck:quick` passes after the applied audit fixes in `analysis/codex-audit/patches/`.

## Historical failures observed during this audit

### `failure_id`: `phase1-prisma-import-alignment`

- `file`: `apps/web/app/api/admin/distribution/actions/route.ts`, `apps/web/app/api/studio/projects/[id]/publish/route.ts`, `apps/web/app/api/studio/templates/[id]/versions/route.ts`, `apps/web/app/api/studio/templates/route.ts`, `apps/web/lib/creatorProgression.ts`
- `line_range`: import statements
- `short_description`: `pnpm -w lint` and `pnpm -w typecheck` failed because `apps/web` imported `@prisma/client` directly without declaring it; the repo-standard shared import path is `@illuvrse/db`.
- `exact_patch`: `analysis/codex-audit/patches/P0-shipcheck-baseline.patch`

### `failure_id`: `phase14-root-test-reporter`

- `file`: `package.json`, `scripts/run-root-test.mjs`
- `line_range`: root test script
- `short_description`: `pnpm -w test --reporter=spec` failed because Vitest treated `spec` as an unknown custom reporter.
- `exact_patch`: `analysis/codex-audit/patches/P0-shipcheck-baseline.patch`

### `failure_id`: `phase2-auth-dev-credentials`

- `file`: `apps/web/lib/env.ts`, `.env.example`
- `line_range`: production auth validation and env defaults
- `short_description`: production auth validation enforced `NEXTAUTH_URL` and `NEXTAUTH_SECRET` but still allowed `ALLOW_DEV_CREDENTIALS_AUTH=true` in production.
- `exact_patch`: `analysis/codex-audit/patches/P0-auth-gating.patch`

### `failure_id`: `phase3-migration-policy-doc`

- `file`: `packages/db/MIGRATIONS.md`
- `line_range`: new file
- `short_description`: `scripts/check-db-migrations.mjs` pointed engineers to `MIGRATIONS.md`, but the referenced policy file did not exist.
- `exact_patch`: `analysis/codex-audit/patches/P0-db-migration-guard.patch`

### `failure_id`: `phase1-lockfile-truth`

- `file`: `pnpm-lock.yaml`, `packages/media-corp-agents/package.json`
- `line_range`: dependency metadata drift
- `short_description`: `pnpm install --frozen-lockfile` failed because the lockfile was stale relative to workspace package manifests.
- `exact_patch`: backlog task only; no safe automated patch was applied in this audit because dependency resolution requires a real install/update cycle.

## Validation commands

```bash
pnpm -w lint
pnpm -w typecheck
pnpm -w test --reporter=spec
pnpm --filter @illuvrse/gamegrid test
pnpm shipcheck:quick
```

## Result

- `pnpm shipcheck:quick` now returns zero.
