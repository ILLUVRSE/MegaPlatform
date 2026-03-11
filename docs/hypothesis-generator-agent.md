# Hypothesis Generator Agent

Phase 82 introduces automated hypothesis generation from telemetry anomalies.

## Policy

- `ops/governance/hypothesis-generation.json`

Controls:

- minimum anomaly delta
- max hypotheses generated per run
- default target agent

## API

- `POST /api/admin/optimization/hypotheses/generate`

Input:

- `anomalies[]` with `signal` and `deltaRatio`

Output:

- generated queue tasks with confidence and risk metadata.
