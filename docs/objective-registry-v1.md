# Objective Registry v1

Phase 81 adds a governed objective registry for autonomous optimization loops.

## Registry

- `ops/governance/objectives.json`

Each objective includes:

- `id`
- `scope` (global/module)
- `owner`
- `metricKey`
- `target`

## Admin API

- `GET /api/admin/objectives`
