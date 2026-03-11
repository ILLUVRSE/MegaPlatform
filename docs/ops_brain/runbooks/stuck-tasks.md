# Stuck Tasks Runbook

Use this runbook when tasks are stuck in `in_progress` or `blocked` beyond SLA.

## Triage
- Verify owning agent and last `steps_log` update.
- Check `docs/logs` for matching incident output.
- Capture blockers and next action in task `steps_log`.

## Resolution
- If unblocked, move task back to `pending` with updated context.
- If persistent, keep blocked and escalate in `docs/ops_brain/decisions.md`.
