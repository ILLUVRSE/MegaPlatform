Title: [P1] Tighten migration safety workflow beyond inline markers - phase:3

## Summary
Phase 3 runtime checks pass, but destructive migration approval still relies on inline `MIGRATION_ALLOW_DESTRUCTIVE:` comments. The repo now has `packages/db/MIGRATIONS.md`, but there is still no explicit human-approval flag or justification artifact gate for high-risk non-dev migration workflows.

## Phase
3 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Inspect `scripts/check-db-migrations.mjs`
2. Observe destructive SQL is accepted with in-file markers alone
3. Compare to desired non-dev guardrails for human approval and justification files

## Acceptance criteria
- Non-dev destructive migration workflows require explicit operator acknowledgement
- A justification artifact is linked from the migration or deploy step
- Migration docs match the enforced workflow

## Proposed changes
- Extend migration lint or deploy wrappers with a justification-file requirement
- Add explicit non-dev migration wrapper documentation
- Keep `prisma:migrate:deploy` as the only promoted non-dev path

## Tests
- Add lint/deploy wrapper tests for reject/accept paths

## Risk & Rollback
- Medium process risk; stricter guards can slow deployment if introduced abruptly
- Roll back by relaxing only the wrapper while retaining documentation

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:3`
- `priority:P1`
- `component:packages/db`
- `kind:tech-debt`

## Branch
- `codex/audit/P1-migration-safety-workflow`
