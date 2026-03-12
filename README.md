# ILLUVRSE Monorepo

This repository hosts the active ILLUVRSE platform shell, several standalone app workspaces, shared runtime packages, and a large docs/ops corpus that is partly ahead of runtime.

## What lives here

- Core shell: `apps/web` (Next.js App Router, primary integration surface)
- Integrated platform apps:
  - `apps/news`
  - `apps/gamegrid`
  - `apps/pixelbrawl`
  - `apps/art-atlas`
- Additional app workspaces:
  - `apps/what2watch`
  - `apps/ambush-soccer`
- Shared packages: `packages/*` (`db`, `agent-manager`, `watch-scheduler`, `storage`, `audit`, `ui`, `world-state`)
- Ops/docs/runbooks: `docs/`, `ops/`

## Current platform reality

- `apps/web` is the center of gravity.
- `apps/web/app/admin` is the only current admin home in the repo.
- Standalone apps under `apps/*` are real but not equivalent to the main shell.
- Prisma in `packages/db` is the shared persistence backbone.
- Media-corp v1-v3 is a real synthetic/internal operating model exposed through the admin surface.
- Media-corp v4 exists mainly as schema/type/service surface area and is not a full end-to-end autonomous runtime.
- Many autonomy/governance/ops surfaces are real as manifests, evaluators, and local admin controls, but not as a broad always-on autonomous platform.
- The old root Ambush Soccer mirror and legacy `admindashboard/` workspace were removed in this cleanup pass. See `docs/repo-current-state.md`.

## Primary run modes (from repo root)

```bash
pnpm run dev:core
```

Runs only the core ILLUVRSE shell.

```bash
pnpm run dev:platform
```

Runs core shell plus News, GameGrid, PixelBrawl, and Art Atlas in parallel.

## Quality gates

```bash
pnpm db:safety
```

Runs migration lint + Prisma schema validation.

```bash
pnpm shipcheck:quick
```

Runs lint, typecheck, and unit checks.

```bash
pnpm shipcheck
```

Runs full shipcheck including e2e smoke.

```bash
pnpm api:registry:check
```

Regenerates `docs/api-registry.web.json` and fails if the committed registry is stale.

## API registry CI wiring

Maintain the API registry check in CI with the local script below instead of editing untracked workflow files in feature branches.

Run locally:

```bash
node scripts/ci/check-api-registry.mjs
```

Add this step to `.github/workflows/ci.yml` after checkout, Node setup, and `pnpm install`:

```yaml
- name: Check API registry
  run: node scripts/ci/check-api-registry.mjs
```

The script runs `pnpm api:registry:generate`, compares the generated output against the committed [`docs/api-registry.web.json`](/home/ryan/ILLUVRSE/docs/api-registry.web.json), restores the committed file contents after comparison, and exits non-zero when the registry diff has not been committed.

## Data services commonly needed locally

- Postgres (platform data via Prisma)
- Redis (party/studio queue + realtime state)
- S3-compatible storage (MinIO for local uploads/renders)

See:

- `apps/web/README.md`
- `apps/web/app/party/README.md`
- `apps/web/app/studio/README.md`
- `docs/web-runbook.md`
- `docs/worker-runbook.md`

## Implementation phases

Canonical phase map and command references:

- `docs/ILLUVRSE_PHASES.md`
- `docs/ILLUVRSE_PHASES_NEXT100.md`
- `docs/PHASE_EXECUTION_LEDGER.md`
- `docs/platform-domain-map.md`
- `docs/platform-event-taxonomy.md`
- `docs/identity-contract.md`
- `docs/content-lifecycle-contract.md`
- `docs/platform-routing-contract.md`
- `docs/api-surface-registry.md`
- `docs/api-error-model.md`
- `docs/config-contract.md`
- `docs/platform-capability-matrix.md`
- `docs/monorepo-boundaries.md`
- `docs/repo-current-state.md`
- `docs/agent-operating-system.md`
- `docs/ops_brain/control-plane-v2.md`
- `docs/intelligence-fabric.md`
