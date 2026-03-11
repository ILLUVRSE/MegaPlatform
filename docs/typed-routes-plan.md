# Typed Routes Re-enable Plan

Status: `typedRoutes` is intentionally OFF in `apps/web/next.config.ts` to keep builds stable.

## Why disabled
- Current codebase has many dynamic route literals and link constructions that are not yet typed-route compliant.
- Enabling immediately creates widespread type churn and blocks release hardening work.

## Top offender areas
- `apps/web/app/watch/**` dynamic links and slug/id interpolation.
- `apps/web/app/admin/**` edit/detail links built from user data.
- `apps/web/app/studio/**` job/project route literals.
- API route helper calls that build path strings without typed helpers.

## Re-enable checklist
1. Add shared route-builder helpers for high-traffic dynamic paths (`watch`, `admin`, `studio`, `party`).
2. Replace string interpolation in `Link href` with typed route helpers.
3. Run `next typegen` and `pnpm --filter @illuvrse/web exec tsc --noEmit`.
4. Flip `typedRoutes: true` in `apps/web/next.config.ts`.
5. Add CI gate that fails when `typedRoutes` is disabled after this migration.

## Done criteria
- `typedRoutes: true` on `main`.
- `pnpm --filter @illuvrse/web exec tsc --noEmit` passes with no route type suppressions.
- No raw interpolated `Link href` for dynamic routes in app code.
