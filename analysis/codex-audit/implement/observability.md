# Observability Notes

This pass aligned the runtime with the existing Phase 15 baseline instead of introducing a new telemetry package.

Implemented in code:

- `platform.page_load` is emitted from the root layout client telemetry component.
- `module_open` and `module_open_direct` remain the canonical shell events for embedded and direct module launches.
- Games telemetry now normalizes legacy event names into:
  - `games.catalog.view`
  - `games.open`
  - `games.open.direct`
  - `game.embed.load`
  - `game.publish`
- Party voice issuance now emits `party.voice.token.issued`.

Existing observability surfaces retained:

- `GET /api/admin/observability/summary`
- `ops/governance/slos.json`
- platform telemetry persistence in `PlatformEvent`

Validation completed:

- `pnpm --filter @illuvrse/db exec node ./scripts/migration-lint.js`
- `pnpm --filter @illuvrse/web lint`
- `pnpm shipcheck:quick`

Deferred:

- phase prompt items for Prometheus/Grafana job assets and end-to-end smoke/load harnesses
- extraction of a shared telemetry workspace package
