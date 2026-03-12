# Codex Audit Rerun Guide

## Scope

This folder contains the March 11, 2026 Codex repository audit for `ILLUVRSE`.

## Prerequisites

- `pnpm`
- workspace dependencies installed
- optional local security tools:
  - `gitleaks`
  - `trivy`

## Re-run

```bash
git fetch --all
git checkout main || git checkout trunk || git checkout $(git rev-parse --abbrev-ref HEAD)
pnpm install --frozen-lockfile
mkdir -p analysis/codex-audit/outputs

pnpm shipcheck:quick > analysis/codex-audit/outputs/shipcheck-quick.txt 2>&1
pnpm governance:check > analysis/codex-audit/outputs/governance-check.txt 2>&1 || true
pnpm -w lint > analysis/codex-audit/outputs/lint.txt 2>&1
pnpm -w typecheck > analysis/codex-audit/outputs/typecheck.txt 2>&1
pnpm -w test --reporter=spec > analysis/codex-audit/outputs/tests.txt 2>&1 || true
pnpm --filter @illuvrse/gamegrid test > analysis/codex-audit/outputs/gamegrid-tests.txt 2>&1 || true
pnpm -w build > analysis/codex-audit/outputs/build.txt 2>&1 || true

gitleaks detect --source . --report-path analysis/codex-audit/outputs/gitleaks.json > analysis/codex-audit/outputs/gitleaks.txt 2>&1 || true
pnpm audit --json > analysis/codex-audit/outputs/npm-audit.json 2> analysis/codex-audit/outputs/npm-audit.stderr.txt || true
trivy fs --no-progress --output analysis/codex-audit/outputs/trivy.txt . || true

pnpm db:migrations:lint > analysis/codex-audit/outputs/migrations-lint.txt 2>&1 || true
pnpm --dir packages/db exec prisma validate --schema schema.prisma > analysis/codex-audit/outputs/prisma-validate.txt 2>&1 || true
```

## Notes

- The correct GameGrid workspace filter is `@illuvrse/gamegrid`.
- If `pnpm install --frozen-lockfile` fails, treat that as an audit finding, not a transient local error.
- This audit generated patch files in `analysis/codex-audit/patches/` and issue drafts in `analysis/codex-audit/issues/`.
