Title: [P1] Extend release gates beyond apps/web to satellite products - phase:14

## Summary
The root quality scripts validate the platform shell well, but the audit had to manually correct the GameGrid workspace filter and there is no equivalent top-level gate coverage for the full satellite app set. That leaves platform-level release confidence narrower than the monorepo surface.

## Phase
14 (`docs/ILLUVRSE_PHASES.md`)

## Reproduction
1. Inspect root `package.json` scripts
2. Observe root `build`, `lint`, `typecheck`, and `test` are web-centric
3. Compare with the repo structure containing major satellite products such as GameGrid, News, PixelBrawl, Art Atlas, What2Watch, and Ambush Soccer

## Acceptance criteria
- Root release gates include the satellite apps that are part of the shipped platform surface
- Workspace filters are canonical and documented
- Failing satellite builds/tests block promotion when in-scope

## Proposed changes
- Add platform-wide test/build script variants with verified filters
- Document which products are promotion-blocking
- Consider phased gate tiers if all apps should not block every change

## Tests
- Run the expanded root gate in CI
- Confirm failing satellite checks block the promoted path

## Risk & Rollback
- Medium risk because broader gates can increase CI time and failure frequency
- Roll back by narrowing the promotion set, not by removing root gate visibility

## Suggested reviewers
- @ryan.lueckenotte

## Labels
- `phase:14`
- `priority:P1`
- `component:ops`
- `kind:tech-debt`

## Branch
- `codex/audit/P1-platform-release-gates`
