# Governance Drift Monitor

Phase 103 introduces drift detection between intended policy behavior and observed runtime decisions.

## Governance Policy

- `ops/governance/governance-drift-monitor.json`

Policy defines mismatch thresholds, minimum sample size, and severity escalation.

## Runtime Inputs

- `ops/logs/policy-decision-samples.json`

Observed policy decision samples are compared against expected allow/deny effects.

## Runtime

- `apps/web/lib/governanceDrift.ts`

The report includes:
- drift signals
- severity classification
- remediation proposals

## API

- `GET /api/admin/governance/drift`
