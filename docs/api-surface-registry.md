# API Surface Registry (Phase 26)

Canonical API route inventory for the core shell.

## Registry Artifact
- `docs/api-registry.web.json`
- Scope: `apps/web/app/api/**/route.ts`

## Commands
- Generate/refresh registry:
  - `pnpm api:registry:generate`
- Validate registry is in sync:
  - `pnpm api:registry:check`

## Release Gate

`pnpm shipcheck` now includes `api-registry` validation.

If routes are added/removed/renamed and registry is stale, check fails with:
- `registry drift detected`

Fix by regenerating and committing the updated registry file.

## Notes

- Methods are inferred from exported route handlers: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Registry is deterministic and timestamp-free to avoid needless churn.
