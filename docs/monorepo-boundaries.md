# Monorepo Boundaries

This note defines the practical ownership boundaries that exist in the repo today. It is intentionally descriptive rather than aspirational.

## Core platform

- `apps/web` is the unified shell and canonical admin surface.
- `packages/db` is the canonical shared schema/client layer.
- `packages/world-state`, `packages/storage`, `packages/agent-manager`, `packages/watch-scheduler`, `packages/audit`, and `packages/ui` are support packages for the main platform.

## Standalone app workspaces

- `apps/news`
- `apps/gamegrid`
- `apps/pixelbrawl`
- `apps/art-atlas`
- `apps/what2watch`
- `apps/ambush-soccer`

These are app slices with their own runtime concerns. They can integrate with the platform, but they are not subfolders of `apps/web`.

## Media-corp boundary

- Runtime admin entrypoint: `apps/web/app/admin/media-corp`
- Runtime service layer: `apps/web/lib/media-corp`
- Shared media-corp model packages: `packages/media-corp-*`

Current state:

- v1-v3 behavior is real, but synthetic and sandbox-backed.
- v4 executive autonomy/governance models are ahead of full runtime execution.

## Legacy and transitional areas

- The old root Ambush Soccer mirror has been removed. `apps/ambush-soccer` is the only Ambush Soccer workspace.
- `apps/web/app/admin` is the canonical and only current admin surface.

## Validation script

- `scripts/check-boundaries.mjs`

## Command

- `pnpm boundaries:check`

## Current rule

- Blocks direct cross-root relative imports from source files into `apps/` or `packages/` trees.
- Intended to keep module boundaries explicit and prevent brittle path coupling.

## Release gate

- Included in `pnpm shipcheck` and `pnpm shipcheck:quick`.
