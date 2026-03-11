# External Module SDK v1

Phase 91 introduces a reusable SDK contract for embedding third-party modules in the ILLUVRSE shell.

## SDK

- `apps/web/lib/externalModuleSdk.ts`

Provides a typed manifest schema and registration helper:

- `registerExternalModule(manifest)`

## Live Integration

External module directory registration now validates module manifests through SDK contract in:

- `apps/web/lib/platformApps.ts`

## Governance

- `ops/governance/external-module-sdk.json`
