# Autonomous Loop Reliability Review

Phase 90 adds a reliability review endpoint for autonomous optimization loops.

## Policy

- `ops/governance/autonomous-loop-review.json`

## Input Signal

- `ops/logs/autonomous-loop-runs.json`

## API

- `GET /api/admin/optimization/loops/reliability-review`

Review includes success/error/latency checks plus override runbook existence validation.
