# Edge Delivery and Performance Layer

Phase 99 adds edge-aware routing and monitored latency budgets.

## Policy Registry

- `ops/governance/edge-delivery.json`

## Signal Log

- `ops/logs/edge-performance-snapshots.json`

## APIs

- `POST /api/platform/edge/resolve`
- `GET /api/admin/platform/edge/performance`

The resolver maps module paths to regional edge POPs, and the performance endpoint reports p95 latency budget status for key module prefixes.
