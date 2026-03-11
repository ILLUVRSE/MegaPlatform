# Design Token System v2

Phase 51 introduces a canonical token manifest for shell-level visual consistency.

## Sources of truth

- Manifest: `ops/governance/design-tokens-v2.json`
- Generated CSS output: `packages/ui/src/tokens.css`
- Generator: `scripts/generate-design-tokens.mjs`

## Token groups

- `color`: backgrounds, text, brand, feedback.
- `type`: size and weight scale.
- `spacing`: shared spacing ramp.
- `radius`: input/card/pill corner system.
- `depth`: card/modal shadows.
- `motion`: duration and easing constants.

## Workflow

1. Edit `ops/governance/design-tokens-v2.json`.
2. Run `pnpm design:tokens:generate`.
3. Commit both manifest + generated CSS.
4. `pnpm governance:check` validates token schema and duplicate names.
