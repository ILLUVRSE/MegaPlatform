# Dynamic Licensing Resolver

Phase 156 adds dynamic license compatibility preflight checks for composition and distribution.

## Scope
- Licensing resolver policy: `ops/governance/dynamic-licensing-resolver.json`
- Runtime resolver: `apps/web/lib/dynamicLicensingResolver.ts`
- Admin API: `POST /api/admin/creator/licensing/resolve`

## Behavior
- Resolves compatibility of source license sets against intended use.
- Blocks known incompatible license/use pairs and optionally unknown licenses.
- Returns deterministic allow/deny outcomes before composition execution.
