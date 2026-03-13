# CI Cache Helpers

`tooling/ci/cache-helpers.mjs` centralizes cache key generation for the `apps/news` workspace.

## What it does

- Detects the package manager from the workspace lockfile.
- Prefers `pnpm-lock.yaml` when present and falls back to `package-lock.json` or other lockfiles.
- Computes deterministic cache keys per package for `node_modules`, `pnpm-store`, and Docker layer scopes.
- Emits GitHub Actions outputs so maintainers do not have to hand-roll restore-key logic.

## Commands

Run from `apps/news`:

```bash
node tooling/ci/cache-helpers.mjs --check
node tooling/ci/cache-helpers.mjs key --package web --cache node-modules
node tooling/ci/cache-helpers.mjs restore --package api --cache docker
node tooling/ci/cache-helpers.mjs gha --package . --cache node-modules
node tooling/ci/cache-helpers.mjs docker --package workers
```

## GitHub Actions snippet

Use the helper to restore package-level dependency caches and to wire Docker layer reuse:

```yaml
- name: Compute cache metadata
  id: cache-root
  run: node tooling/ci/cache-helpers.mjs gha --package . --cache node-modules

- name: Restore workspace node_modules
  uses: actions/cache/restore@v4
  with:
    path: |
      node_modules
      api/node_modules
      workers/node_modules
      web/node_modules
    key: ${{ steps.cache-root.outputs.key }}
    restore-keys: ${{ steps.cache-root.outputs.restore_keys }}

- name: Compute Docker cache metadata
  id: docker-api
  run: node tooling/ci/cache-helpers.mjs docker --package api

- name: Build API image with GHA cache
  uses: docker/build-push-action@v6
  with:
    context: .
    file: api/Dockerfile
    push: false
    cache-from: ${{ steps.docker-api.outputs.dockerCacheFrom }}
    cache-to: ${{ steps.docker-api.outputs.dockerCacheTo }}
```

## Invalidation policy

- Lockfile changes must invalidate dependency caches. The helper includes the selected lockfile in every key.
- Package-specific `package.json` changes invalidate only that package's key.
- Docker cache keys also include the package Dockerfile, so dependency layer updates and image recipe changes roll the cache.
- For deliberate manual busts, prepend a version token in the workflow, for example `CACHE_EPOCH=2026-03-13`.

## Risks

- Cache poisoning is possible if write access to the cache is granted to untrusted workflows. Restrict cache save steps to trusted branches or protected environments.
- `node_modules` caches can mask package-manager drift. Keep the fallback path explicit and review cache-manager changes when switching between `npm` and `pnpm`.
