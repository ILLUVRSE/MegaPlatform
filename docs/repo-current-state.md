# ILLUVRSE Current State

Date: 2026-03-07

This document is the short reality-based repo map for the next work session. It is intentionally narrower than the larger planning/spec corpus.

## What the repo is right now

- `apps/web` is the main ILLUVRSE platform shell and the primary integration surface.
- `packages/db` is the shared persistence backbone.
- `apps/news`, `apps/gamegrid`, `apps/pixelbrawl`, `apps/art-atlas`, `apps/what2watch`, and `apps/ambush-soccer` are standalone or semi-standalone product slices.
- `packages/media-corp-*` implement a real internal synthetic media-corp loop used by the admin surface.
- `docs/` and `ops/` contain a large amount of roadmap, contract, governance, and operating-model material that is ahead of runtime in multiple areas.

## Production-shaped vs demo-shaped vs experimental

Production-shaped or actively integrated:

- `apps/web`
- `packages/db`
- `packages/world-state`
- `packages/storage`
- `packages/agent-manager`
- `packages/watch-scheduler`
- `packages/audit`
- `packages/ui`
- the standalone app workspaces under `apps/*`

Demo-shaped or synthetic by design:

- the current media-corp admin workflow in `apps/web/app/admin/media-corp`
- sandbox publishing and manual/demo metrics ingestion in `apps/web/lib/media-corp/service.ts`

Experimental, schema-ahead, or contract-ahead:

- much of the autonomy/governance surface under `docs/`, `ops/governance/`, and many `apps/web/app/api/admin/*` namespaces
- media-corp v4 executive planning/governance/autonomy models in Prisma and shared types
- large parts of the agent/ops/intelligence corpus that currently exist as manifests, logs, policy evaluators, and bounded local admin surfaces

## Boundary summary

- Canonical admin surface: `apps/web/app/admin`
- Canonical media-corp runtime surface: `apps/web/app/admin/media-corp` and `apps/web/lib/media-corp`
- Canonical Ambush Soccer workspace: `apps/ambush-soccer`
- The old root-level Ambush Soccer mirror (`src/`, `server/`, `tests/`, `index.html`, `tsconfig.json`, `vite.config.ts`, `package-lock.json`) was removed in this cleanup pass after confirming it matched `apps/ambush-soccer`
- `admindashboard/` has been retired from the working tree; the active admin surface lives in `apps/web`

## Cleanup choices made in this pass

- kept `apps/web` documented as the platform core instead of implying equal status across every app
- removed the duplicate root Ambush Soccer workspace after confirming it mirrored `apps/ambush-soccer`
- removed the empty `admindashboard/` directory so the repo has one obvious admin home
- marked media-corp dashboard behavior as synthetic/sandbox-backed where that is what the runtime does
- added ignore coverage for common standalone app build/dependency artifacts inside the workspace

## Intentionally deferred

- reducing the very large autonomy/governance doc surface
- broader package extraction or architecture changes
- next likely cleanup target: reduce stale docs and API claims in the autonomy/governance surface
