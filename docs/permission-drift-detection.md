# Permission Drift Detection

Phase 76 adds RBAC drift detection against a governed permission baseline.

## Baseline Manifest

- `ops/governance/rbac-baseline.json`

Defines expected role-to-permission mappings for critical platform roles.

## Drift API

- `GET /api/admin/security/permission-drift`

Returns:

- role-level drift (`addedPermissions`, `missingPermissions`)
- risk class (`critical` for `admin:*` drift)
- remediation guidance

This endpoint supports operational review for privilege escalation or under-permission regressions.
