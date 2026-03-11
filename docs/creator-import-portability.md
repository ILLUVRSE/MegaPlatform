# Creator Import and Portability

Phase 94 introduces creator profile/asset portability APIs with safeguard limits.

## Policy

- `ops/governance/creator-portability.json`

## APIs

- `GET /api/creator/portability/export`
- `POST /api/creator/portability/import`

Import requests are validated for payload size and asset-count constraints before acceptance.
