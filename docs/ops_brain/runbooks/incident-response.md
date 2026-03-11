# Incident Response Runbook

Use this runbook for production-impacting incidents (watch outages, failed publishes, degraded live channels, feed safety regressions).

## Severity

- `SEV-1`: major user impact, platform core unavailable.
- `SEV-2`: partial outage or critical feature broken.
- `SEV-3`: degraded quality/reliability with workaround.

## Triage Checklist

1. Confirm affected surface (`watch`, `party`, `studio`, `feed`, `ops`).
2. Capture exact UTC timestamp and first user-visible symptom.
3. Check `/api/admin/observability/summary` for SLO breaches.
4. Check `/api/admin/launch/readiness` for active blockers.
5. Open/append incident note in `docs/logs/` with timeline and owner.

## Containment

1. Pause unsafe writes or retries if they amplify failure.
2. Roll back most recent risky configuration change.
3. If caused by queue backlog, prioritize critical queue classes first.
4. Communicate current status and next update ETA in incident note.

## Recovery

1. Validate key paths manually (watch playback, studio publish, admin ops mutation).
2. Run `pnpm shipcheck:quick` if code/config changed.
3. Resolve or reclassify incident severity.
4. Mark incident resolved with exact UTC timestamp.

## Postmortem (within 48 hours)

1. Add root cause and contributing factors.
2. Add at least one prevention task to `ops/briefing.md`.
3. Update relevant runbook section with learned mitigation.
