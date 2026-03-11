# Safety Regression CI Gate

Phase 138 adds a CI hard gate for safety behavior regressions.

## Scope
- Gate policy: `ops/governance/safety-regression-gate.json`
- Runtime evaluator: `apps/web/lib/safetyRegressionGate.ts`
- CI gate script: `scripts/safety-regression-gate.mjs`
- Artifacts:
  - input metrics: `ops/logs/safety-metrics.json`
  - output report: `ops/logs/safety-regression-report.json`

## Behavior
- Compares runtime safety metrics against maximum regression thresholds.
- Produces deterministic report output for CI evidence.
- Exits non-zero in CI when configured safety limits are exceeded.
