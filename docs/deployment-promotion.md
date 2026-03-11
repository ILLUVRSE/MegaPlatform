# Deployment Architecture and Promotion

This document defines promotion flow for `dev -> stage -> prod` and required checks.

## Environments

- `dev`: feature validation and local integration.
- `stage`: production-like verification with real integrations.
- `prod`: customer-facing deployment.

## Promotion Rules

1. `dev -> stage`
   - `pnpm shipcheck:quick` passes.
   - `pnpm governance:check` passes.
   - `GET /api/admin/deploy/promotion-readiness` has no missing `stage` env vars.
2. `stage -> prod`
   - Full `pnpm shipcheck` passes.
   - `GET /api/admin/launch/readiness` has zero critical blockers.
   - `GET /api/admin/deploy/promotion-readiness` has no missing `prod` env vars.

## Operational Notes

- Do not promote while `SEV-1` or `SEV-2` incidents are active.
- Record every promotion in ops logs with UTC timestamp, actor, and rollback target.
