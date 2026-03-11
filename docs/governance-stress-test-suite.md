# Governance Stress Test Suite

Phase 110 adds governance stress tests for adversarial and failure scenarios.

## Governance Manifest

- `ops/governance/governance-stress-tests.json`

Defines stress scenarios and expected policy outcomes by control.

## Runtime

- `apps/web/lib/governanceStressTests.ts`

Executes scenarios and produces pass/fail results by control.

## Artifacts

- `ops/logs/governance-stress-tests.json`

## API

- `GET /api/admin/governance/stress-tests/run`
- `POST /api/admin/governance/stress-tests/run`

## CI Hook

- `pnpm governance:stress:test`
