Title: [P0] Restore shipcheck baseline reliability - phase:1

## Summary
Root quality gates were not reproducible from a clean audit run. `pnpm -w lint` failed on direct `@prisma/client` imports inside `apps/web`, and `pnpm -w test --reporter=spec` failed because the root test path forwarded an unsupported Vitest reporter string. This blocked the Phase 1 requirement that `shipcheck:quick` be a reliable baseline.

## Phase
1 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Run `pnpm -w lint`
2. Observe TypeScript failures resolving `@prisma/client` from `apps/web`
3. Run `pnpm -w test --reporter=spec`
4. Observe Vitest startup failure loading reporter `spec`

## Acceptance criteria
- `pnpm -w lint` passes
- `pnpm -w typecheck` passes
- `pnpm -w test --reporter=spec` passes
- `pnpm shipcheck:quick` passes

## Proposed changes
- Route Prisma type imports through `@illuvrse/db`
- Add a root test wrapper that maps the audit-required `spec` reporter to a supported Vitest reporter
- Files to edit:
  - `package.json`
  - `scripts/run-root-test.mjs`
  - `apps/web/app/api/admin/distribution/actions/route.ts`
  - `apps/web/app/api/studio/projects/[id]/publish/route.ts`
  - `apps/web/app/api/studio/templates/[id]/versions/route.ts`
  - `apps/web/app/api/studio/templates/route.ts`
  - `apps/web/lib/creatorProgression.ts`

## Tests
- `pnpm -w lint`
- `pnpm -w test --reporter=spec`
- `pnpm shipcheck:quick`

## Risk & Rollback
- Low risk; changes are import-path and script orchestration only
- Roll back by reverting the patch if root command expectations change

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:1`
- `priority:P0`
- `component:apps/web`
- `kind:bug`

## Branch
- `codex/audit/P0-shipcheck-baseline`
