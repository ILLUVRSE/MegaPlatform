# SHIPCHECK Report

- Date: 2026-03-13
- Branch: `run/shipcheck-full-day`
- Command: `pnpm shipcheck`
- Result: `FAIL` at `e2e-smoke`

## Summary

`pnpm shipcheck` completed all non-E2E stages successfully:

- PASS `db-safety`
- PASS `governance`
- PASS `config-contract`
- PASS `api-registry`
- PASS `platform-runtime`
- PASS `boundaries`
- PASS `key-rotation`
- PASS `supply-chain`
- PASS `lint`
- PASS `typecheck`
- PASS `party-slo`
- PASS `studio-worker-retry`
- PASS `unit`
- FAIL `e2e-smoke`

The unit/integration pass inside `pnpm test` completed cleanly with `327` test files passed and `497` tests passed.

## Failing Items

### 1. `tests/e2e/homepage.spec.ts:3` - `wall supports like and comment`

- Status: Failing
- Failure class: Blocking E2E setup failure
- Failure trace:

```text
Test timeout of 60000ms exceeded while setting up "page".
Error: browserContext.newPage: Test timeout of 60000ms exceeded.
trace: /tmp/illuvrse-playwright/homepage-wall-supports-like-and-comment/trace.zip
```

- Flakiness score: Not available from this run
- Suggested fix: Investigate Playwright browser/page bootstrap on the main platform before touching homepage interactions. Focus on Firefox launch stability, browser context creation, and any shared fixture/setup regression in `apps/web/tests/e2e/playwright.config.ts`.
- Quarantine plan: Do not quarantine yet. The failure happens before test actions begin, so quarantining this single case would likely hide a broader E2E platform issue rather than isolate a flaky assertion.
- Proposed owner: Web platform + QA
- Target schedule: Triage on 2026-03-13, fix or root-cause by 2026-03-14

### 2. `tests/e2e/homepage.spec.ts:20` - `switches to shorts mode`

- Status: Failing
- Failure class: Blocking E2E setup failure
- Failure trace:

```text
Test timeout of 60000ms exceeded while setting up "page".
Error: browserContext.newPage: Test timeout of 60000ms exceeded.
trace: /tmp/illuvrse-playwright/homepage-switches-to-shorts-mode/trace.zip
```

- Flakiness score: Not available from this run
- Suggested fix: Treat as the same root cause as item 1 until proven otherwise. Validate whether `browserContext.newPage` failure reproduces with a minimal Playwright smoke case and whether the default Firefox worker is hanging in CI/local headless startup.
- Quarantine plan: Keep paired with item 1. If a same-day release is blocked and root cause remains unresolved, quarantine the entire `homepage.spec.ts` smoke file behind a temporary ticketed exception instead of quarantining one test at a time.
- Proposed owner: Web platform + QA
- Target schedule: Triage on 2026-03-13, quarantine decision by 2026-03-14 if no fix lands

## Top 5 Blocking Items

1. `e2e-smoke` is red because Playwright cannot complete `browserContext.newPage` for homepage smoke coverage.
2. Both homepage smoke tests fail at setup, indicating a shared platform/bootstrap issue rather than isolated feature regressions.
3. No flakiness metadata is emitted by `pnpm shipcheck`, so quarantine decisions need one focused reproduction run before changing test policy.
4. The failing traces need review from `/tmp/illuvrse-playwright/.../trace.zip` to determine whether Firefox startup, context creation, or app readiness is stalling.
5. Shipcheck emitted a large-PR warning (`16 files`, `6272 lines`) caused by unrelated existing worktree changes; this is a workflow risk for any follow-up PR, not a shipcheck code failure.

## Cross-Package / Unrelated Issues Observed

- Existing unrelated workspace changes triggered the shipcheck PR-size warning:

```text
[shipcheck][warn] Large PR footprint detected (16 files, 6272 lines).
```

- This job did not attempt any cross-package cleanup or unrelated fixes.

## Next Steps

1. Web platform owner: reproduce `pnpm --filter @illuvrse/web exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/homepage.spec.ts` and inspect both trace archives.
2. QA owner: rerun the homepage smoke file once after reproduction setup is stable to determine whether this is deterministic or flaky.
3. If reproducible, assign browser/bootstrap root-cause work on 2026-03-13 and land a fix by 2026-03-14.
4. If not fixable by 2026-03-14, prepare a temporary quarantine proposal for `homepage.spec.ts` with an expiry date and owner.
5. Keep unrelated cross-package/worktree changes out of the follow-up PR so the smoke fix can ship independently.
