# P1: Branching and PR flow still needed

## Why this exists

The repository had unrelated local modifications before this pass. To avoid mixing those changes into generated commits, the implementation was delivered as a local patch and artifact bundle only.

## Remaining scope

- Create clean topic branches from a stable base
- Reapply the patch selectively
- Split changes into reviewable commits
- Open PRs when GitHub credentials are available

## Acceptance criteria

- Separate branches exist for at least auth/config, telemetry, and CI/gates
- Each branch contains only its intended delta
- PR descriptions include phase mapping, tests, risk, and rollback notes

## Patch reference

- `analysis/codex-audit/implement/patches/codex-implement.patch`
