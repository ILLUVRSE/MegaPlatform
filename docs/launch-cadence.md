# Launch and Post-Launch Optimization Cadence

## Pre-Launch (T-7 to T-0)

1. Daily check `GET /api/admin/launch/readiness`.
2. Resolve all critical blockers before promotion.
3. Freeze non-critical feature merges for final 24 hours.

## Launch Day (T+0)

1. Validate watch, studio, party, and feed core journeys.
2. Monitor SLO and budget endpoints every 30 minutes.
3. Trigger incident runbook immediately for any `SEV-1`/`SEV-2` symptom.

## Post-Launch (T+1 to T+30)

1. Run weekly review of growth funnel and recommendation diagnostics.
2. Re-baseline budgets and SLO targets using observed month-to-date behavior.
3. Convert repeated incidents and manual mitigation steps into updated runbooks.
