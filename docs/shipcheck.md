# Shipcheck

`shipcheck` is the release gate for Phase 1 all-day operations.

## Commands
- `pnpm shipcheck`: db safety + governance + api-registry + lint + typecheck + unit + e2e smoke
- `pnpm shipcheck:quick`: db safety + governance + api-registry + lint + typecheck + unit
- `pnpm governance:check`: validates `ops/governance/*.json` guardrail manifests
- `pnpm api:registry:check`: validates `docs/api-registry.web.json` matches current API routes

## Guardrails
- Branch discipline: never commit directly to `main`; always work on a feature branch.
- PR size guideline: target <= 30 changed files and <= 800 changed lines when practical.
  `shipcheck` prints a warning if this guideline is exceeded.

## Exit Behavior
- Any failing stage exits non-zero.
- Summary is printed at the end with PASS/FAIL per stage.
