# Cross-Module Routing Contract (Phase 25)

Canonical route/launch contract for module navigation in ILLUVRSE shell.

## Source Files
- Route metadata: `apps/web/lib/platformApps.ts`
- Route helper layer: `apps/web/lib/platformRoutes.ts`

## Contract

1. Embedded shell route
- Must be an internal normalized route (leading `/`).
- Resolved through `resolveEmbeddedRoute(...)`.

2. Direct launch URL
- For external modules, use explicit `launchUrl`/`url`.
- For internal-only entries, fallback to embedded route.
- Resolved through `resolveDirectLaunchUrl(...)`.

## Current Consumer Surfaces

- Apps directory cards:
  - `apps/web/app/apps/AppsDirectoryGrid.tsx`
- Embedded external module shell:
  - `apps/web/app/components/EmbeddedPlatformApp.tsx`

## Ownership

- Route metadata ownership: `platformApps.ts`
- Route normalization/fallback ownership: `platformRoutes.ts`
- Telemetry must log normalized embedded route for `module_open` and resolved direct URL for `module_open_direct`.

## Follow-up

- Migrate header nav and hub cards to route helper usage for full parity.
- Add route helper unit tests for invalid/missing launch URL edge cases.
