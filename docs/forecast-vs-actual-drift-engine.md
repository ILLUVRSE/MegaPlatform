# Phase 162 - Forecast vs Actual Drift Engine

Phase 162 introduces deterministic drift detection between forecast and actual autonomous spend, and emits corrective policy actions when drift breaches thresholds.

## Policy

`ops/governance/forecast-vs-actual-drift-engine.json` defines:
- warning and critical drift ratios
- maximum corrective actions to emit
- required budget policy actions
- report output path

## Runtime

`apps/web/lib/forecastActualDriftEngine.ts` computes spend drift ratios and creates drift reports with severity levels:
- `normal`
- `warning`
- `critical`

When drift is `warning` or `critical`, corrective budget actions are generated and marked for planned/immediate execution.

## API

`POST /api/admin/finance/forecast-drift/evaluate` evaluates program spend drift and returns:
- drift report payload
- policy-action trigger state

## Evidence

Reports are written to `ops/logs/forecast-vs-actual-drift-reports.json` for operational review and downstream corrective workflows.
