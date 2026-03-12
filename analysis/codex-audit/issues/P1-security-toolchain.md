Title: [P1] Make repo security scans runnable in local and CI flows - phase:19

## Summary
The audit could not execute `gitleaks` or `trivy` because those binaries are not provisioned in this environment, and `pnpm audit` could not reach the npm registry. Security checks should fail meaningfully because of findings, not because the scan toolchain is absent.

## Phase
19 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Run `gitleaks detect --source . --report-path analysis/codex-audit/outputs/gitleaks.json`
2. Observe `command not found`
3. Run `trivy fs --no-progress --output analysis/codex-audit/outputs/trivy.txt .`
4. Observe `command not found`

## Acceptance criteria
- Local contributors and CI runners have a supported path for `gitleaks` and `trivy`
- Audit docs explain expected install/runtime prerequisites
- Security outputs are produced even when findings are zero

## Proposed changes
- Add documented install path or containerized wrappers for `gitleaks` and `trivy`
- Wire scans into CI with artifact upload
- Preserve current raw log locations under `analysis/codex-audit/outputs`

## Tests
- Execute both scanners in CI or a documented local environment

## Risk & Rollback
- Low risk operational improvement
- Roll back by removing wrappers if the team standardizes on different scanners

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:19`
- `priority:P1`
- `component:ops`
- `kind:tech-debt`

## Branch
- `codex/audit/P1-security-toolchain`
