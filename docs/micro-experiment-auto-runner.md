# Micro-Experiment Auto-Runner

Phase 84 adds bounded automated micro-experiment execution.

## Policy

- `ops/governance/micro-experiments.json`

## API

- `POST /api/admin/optimization/experiments/run`

The runner enforces risk bounds and duration limits before starting experiments.
