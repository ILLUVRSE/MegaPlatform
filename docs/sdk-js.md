# JS SDK publish runbook

`@illuvrse/sdk-js` is the public JavaScript SDK package for external ecosystem consumers. It exposes three core areas:

- `createAuthManager` for bearer-token lifecycle and auth headers
- `createJsonFetcher` for authenticated JSON HTTP requests
- `createRealtimeClient`, `useRealtimeSubscription`, and `useRealtimeState` for realtime streaming and React integrations

## Package layout

- Source: `packages/sdk-js/src`
- Tests: `packages/sdk-js/tests`
- Output: `packages/sdk-js/dist`
- Publish workflow template: `.github/workflows/publish-sdk.yml`

## Local validation

Run the package checks before every release candidate:

```bash
pnpm --filter @illuvrse/sdk-js test
pnpm --filter @illuvrse/sdk-js build
```

The build emits:

- ESM bundle: `dist/esm`
- CJS bundle: `dist/cjs`
- Type declarations: `dist/types`

## Release flow

1. Confirm the package version in `packages/sdk-js/package.json`.
2. Run the local validation commands above.
3. Review the generated `dist` artifacts if the API surface changed.
4. Tag the release commit using the versioned SDK tag format, for example `sdk-js-v0.1.0`.
5. Trigger the publish workflow with the target npm tag:
   - `latest` for the default stable channel
   - `next` for prerelease testing
6. Verify the package contents on npm and smoke-test both `import` and `require` consumers.

## Semver policy

- Patch: internal fixes with no public API changes
- Minor: additive exports, non-breaking options, or new event types
- Major: removed exports, changed runtime defaults, auth contract changes, or altered realtime event semantics

If you change exported names or signatures in `packages/sdk-js/src/index.ts`, treat that as a public API review gate.
