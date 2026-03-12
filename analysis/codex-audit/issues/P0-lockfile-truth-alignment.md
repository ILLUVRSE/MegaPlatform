Title: [P0] Repair lockfile truth so frozen installs pass - phase:1

## Summary
The audit preparation step failed at `pnpm install --frozen-lockfile` because `pnpm-lock.yaml` is stale relative to `packages/media-corp-agents/package.json`. That breaks deterministic bootstrapping and invalidates the Phase 1 requirement that the repository be stable and truthful from a clean setup path.

## Phase
1 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Run `pnpm install --frozen-lockfile`
2. Observe `ERR_PNPM_OUTDATED_LOCKFILE`
3. Actual mismatch reported: `packages/media-corp-agents/package.json` added `@illuvrse/media-corp-core@workspace:*`

## Acceptance criteria
- `pnpm install --frozen-lockfile` passes from repo root
- `pnpm-lock.yaml` fully reflects current workspace manifests
- CI includes a frozen-install path

## Proposed changes
- Regenerate the lockfile against current manifests
- Commit the updated `pnpm-lock.yaml`
- Add CI or shipcheck documentation that keeps frozen install green

## Tests
- `pnpm install --frozen-lockfile`
- `pnpm shipcheck:quick`

## Risk & Rollback
- Medium risk because lockfile churn can affect the whole workspace
- Roll back by reverting the lockfile if dependency resolution introduces regressions

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:1`
- `priority:P0`
- `component:ops`
- `kind:tech-debt`

## Branch
- `codex/audit/P0-lockfile-truth`
