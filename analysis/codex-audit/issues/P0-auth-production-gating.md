Title: [P0] Enforce production auth gating - phase:2

## Summary
Production auth validation required `NEXTAUTH_URL` and a strong `NEXTAUTH_SECRET`, but it still permitted `ALLOW_DEV_CREDENTIALS_AUTH=true`. That left a direct path for credentials-provider auth to be re-enabled in production, violating the Phase 2 baseline.

## Phase
2 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Set `NODE_ENV=production`
2. Set valid `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `REDIS_URL`
3. Set `ALLOW_DEV_CREDENTIALS_AUTH=true`
4. Import and call `assertAuthSecurityConfig()` from `apps/web/lib/env.ts`
5. Expected: throw; actual before fix: no error

## Acceptance criteria
- Production startup throws when `ALLOW_DEV_CREDENTIALS_AUTH=true`
- `.env.example` defaults to `ALLOW_DEV_CREDENTIALS_AUTH=false`
- Auth validation tests cover both the reject and accept paths

## Proposed changes
- Add an explicit production guard in `apps/web/lib/env.ts`
- Flip the root env template default to `false`
- Add auth config tests

## Tests
- `pnpm --filter @illuvrse/web exec vitest run --config tests/vitest.config.ts tests/unit/auth-config.test.ts`

## Risk & Rollback
- Moderate security-sensitive change; rollback only if a non-production deploy path relied on the prod flag semantics
- Roll back by reverting the patch and restoring the old env behavior

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:2`
- `priority:P0`
- `component:apps/web`
- `kind:bug`

## Branch
- `codex/audit/P0-auth-gating`
