# Open Telemetry Bridge

Phase 96 adds a bridge that normalizes approved external-module telemetry into the canonical platform event taxonomy.

## Policy Registry

- `ops/governance/open-telemetry-bridge.json`

## API

- `POST /api/admin/platform/telemetry/bridge`

Bridge requests are denied unless the source is enabled and the external event is mapped to a canonical platform event.
