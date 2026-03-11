# Incident Automation v1

Phase 73 adds policy-driven first-response automation for common incident classes.

## Policy Manifest

- `ops/governance/incident-automation-actions.json`

Each action includes:

- `severity`: highest incident class where action is valid
- `safe`: action must be non-destructive
- `steps`: deterministic execution checklist emitted in API response

## Admin API

- `GET /api/admin/incidents/automation`: list available actions
- `POST /api/admin/incidents/automation`: trigger action with payload:
  - `actionId`
  - `severity` (`SEV-1 | SEV-2 | SEV-3`)

All successful action triggers emit audit entries with `INCIDENT_AUTOMATION_TRIGGERED`.
