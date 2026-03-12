# Codex Audit Report

Date: 2026-03-11

## Executive summary

- The repo matches the intelligence report’s central claim: `apps/web` is the real platform shell, with `apps/gamegrid` as the strongest satellite runtime and a much larger doc/spec layer than the current production surface (`docs/ILLUVRSE_MONOREPO_INTELLIGENCE_REPORT.md:11-22`, `:30-39`, `:94-110`).
- Phase 6 and Phase 9 are materially implemented in code and tests: party heartbeat/SSE/voice-token routes exist, and games telemetry plus GameGrid multiplayer coverage are present (`docs/ILLUVRSE_PHASES.md:102-151`).
- The highest-confidence blockers were Phase 1/2/14 issues: frozen install failure from lockfile drift, broken root gate reproducibility, and permissive production auth behavior.
- Storage, party, and GameGrid were stronger than the prompt assumed; the biggest remaining gaps are operational: security scan toolchain availability, observability expansion, and platform-wide release gates.
- `pnpm shipcheck:quick` now passes after the audit patches; `pnpm install --frozen-lockfile` still fails and remains the top unresolved P0.

## Top 10 technical risks

1. `pnpm install --frozen-lockfile` fails because the lockfile is stale relative to workspace manifests. Phase 1 blocker.
2. Production auth was permitting `ALLOW_DEV_CREDENTIALS_AUTH=true`. Phase 2 security blocker; patched.
3. Root quality gates were not reproducible from audit commands because the root test path did not support `--reporter=spec` and web files imported Prisma incorrectly. Phase 1/14 blocker; patched.
4. Security scans are not operationally runnable here because `gitleaks` and `trivy` are absent, and `pnpm audit` was network-blocked.
5. Platform release gates are still centered on `apps/web`, while the repo reality includes multiple satellite products (`docs/ILLUVRSE_MONOREPO_INTELLIGENCE_REPORT.md:149-167`).
6. Observability is partial: shell and games telemetry exist, but watch/live/party telemetry is not yet first-class persisted SLO input.
7. The repo remains “vision-rich / runtime-thin” for several anchors because the governance corpus still outpaces service decomposition (`docs/ILLUVRSE_MONOREPO_INTELLIGENCE_REPORT.md:73-80`, `:94-100`).
8. Access control sophistication is below the implied governance model, especially outside the hardened auth paths already present in `apps/web` (`docs/ILLUVRSE_MONOREPO_INTELLIGENCE_REPORT.md:94-99`).
9. Build validation is web-only at the root, leaving satellite build/test health dependent on manual invocation.
10. No `CODEOWNERS` file was found, so backlog routing and reviewer automation are weak by default.

## Vision mapping

| vision_anchor | repo_paths | status | gaps | first_3_tasks | proposed_SLOs |
| --- | --- | --- | --- | --- | --- |
| Platform hub (Roku) | `apps/web`, external registry | Partial scaffold | root gates and ownership automation lag runtime shell quality | fix frozen install; extend release gates; add CODEOWNERS | nav errors < 0.5%, shell API p95 < 300ms |
| Video (YouTube) | `apps/web/watch`, `packages/storage`, Studio | Partial scaffold | watch telemetry and entitlement/runtime observability are incomplete | add watch telemetry; tie SLOs to live health; expand build gates | playback start success > 99.5% |
| Live (Twitch) | party voice, live routes, LiveKit token flow | Partial scaffold | no first-class live/voice telemetry persistence; no audited multi-surface SLO reporting | add party/live telemetry; connect SLO summary; exercise smoke runbook | live health OK 99.5% |
| UGC worlds (Roblox) | `apps/gamegrid`, `src/games`, `src/mp` | Partial scaffold | publishing/runtime strong, but root promotion gates do not treat GameGrid as first-class | keep GameGrid in root gates; add telemetry dashboards; define creator publish SLOs | embed load success > 99.5% |
| Store (Steam) | games catalog, monetization APIs | Partial scaffold | commercial completion and settlement are incomplete per intelligence report | tie publish/monetization to observability; define entitlement/payment contract; harden creator economy reviews | purchase API success > 99.5% |
| Social (Discord) | `packages/world-state`, `apps/web/party` | Partial scaffold | presence works, but platform-level social telemetry and SLO evaluation are missing | persist party events; monitor heartbeat loss; add ownership/reviewer routing | heartbeat keepalive > 99.9% |
| Discovery (TikTok) | `apps/web/shorts`, feed ranking/moderation | Partial scaffold | runtime exists, but moderation/telemetry/SLO enforcement still trails product ambition | add discovery SLOs; expose moderation metrics; promote full release gates | feed API p95 < 300ms |

Citations: `docs/ILLUVRSE_MONOREPO_INTELLIGENCE_REPORT.md:11-22`, `:30-39`, `:44-59`, `:83-100`, `:149-167`; `docs/ILLUVRSE_PHASES.md:43-207`.

## Quick wins

### P0 / done in this audit

- Shipcheck baseline reliability
  - patch: `analysis/codex-audit/patches/P0-shipcheck-baseline.patch`
  - commands:
    - `pnpm -w lint`
    - `pnpm -w test --reporter=spec`
    - `pnpm shipcheck:quick`
- Auth production gating
  - patch: `analysis/codex-audit/patches/P0-auth-gating.patch`
  - command:
    - `pnpm --filter @illuvrse/web exec vitest run --config tests/vitest.config.ts tests/unit/auth-config.test.ts`
- Migration policy doc alignment
  - patch: `analysis/codex-audit/patches/P0-db-migration-guard.patch`
  - command:
    - `pnpm --filter @illuvrse/web exec vitest run --config tests/vitest.config.ts tests/unit/migration-lint.test.ts`

### P0 / still open

- Lockfile truth alignment
  - command:
    - `pnpm install --frozen-lockfile`
  - required change:
    - refresh `pnpm-lock.yaml` against current workspace manifests

## 90-day roadmap

- Phase 1: repair frozen install, add CODEOWNERS, keep `shipcheck:quick` green.
- Phase 2: complete auth/security rollout validation in startup and CI.
- Phase 14: promote GameGrid and selected satellite apps into root release gates.
- Phase 15: add persisted watch/live/party telemetry and expose SLO summary.
- Phase 19: make `gitleaks` and `trivy` runnable in local and CI flows.

## 6-12 month roadmap

- Stabilize the platform shell plus GameGrid/News as the true shipped monorepo set.
- Reduce doc/runtime mismatch by converting doc-only anchors into API + DB + telemetry + test contracts.
- Split monolithic operational concerns behind clearer package/service boundaries where scale requires it.
- Tie platform promotion, compliance evidence, and observability into one production-readiness control loop.

## Compliance and security blockers

- `pnpm install --frozen-lockfile` fails.
- `gitleaks` not installed in this environment.
- `trivy` not installed in this environment.
- `pnpm audit` could not reach `registry.npmjs.org`.
- One unresolved supply-chain vulnerability remains reported by the existing supply-chain script, although it was not marked a blocker by current policy.

## Owner suggestions

| task | suggested_owner |
| --- | --- |
| Lockfile truth alignment | @ryan.lueckenotte |
| Auth production gating rollout | @ryan.lueckenotte |
| Shipcheck baseline ownership | @ryan.lueckenotte |
| Migration safety workflow hardening | @ryan.lueckenotte |
| Security scan toolchain | @ryan.lueckenotte |
| Observability telemetry expansion | @ryan.lueckenotte |
| Platform-wide release gates | @ryan.lueckenotte |
