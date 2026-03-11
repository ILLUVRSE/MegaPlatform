# Multi-Tenant Controls v1

Phase 97 adds tenant boundary checks across API access and row-level data access.

## Policy Registry

- `ops/governance/multi-tenant-controls.json`

## API

- `POST /api/admin/tenancy/authorize`

Requests are denied unless the tenant is known, the request path/module is allowlisted for that tenant, and row-level tenant ownership matches.
