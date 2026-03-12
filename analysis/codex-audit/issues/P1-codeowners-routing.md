Title: [P1] Add CODEOWNERS-backed ownership routing - phase:1

## Summary
No `CODEOWNERS` file was found in the repository, so issue and PR routing falls back to a single default reviewer. For a repo with `apps/web`, `apps/gamegrid`, shared packages, and ops assets, that is too weak for sustained phased execution.

## Phase
1 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Run `rg --files -g 'CODEOWNERS' -g '.github/**'`
2. Observe no repo `CODEOWNERS` file is present

## Acceptance criteria
- A root `CODEOWNERS` file exists
- Core paths have clear owners
- Generated backlog items can route to named owners without fallback-only behavior

## Proposed changes
- Add a root `CODEOWNERS`
- Map ownership for:
  - `apps/web`
  - `apps/gamegrid`
  - `packages/db`
  - `packages/storage`
  - `ops`

## Tests
- Manual routing verification through GitHub or local review of path matches

## Risk & Rollback
- Low risk process improvement
- Roll back by simplifying ownership patterns if the first draft is too granular

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:1`
- `priority:P1`
- `component:ops`
- `kind:tech-debt`

## Branch
- `codex/audit/P1-codeowners-routing`
