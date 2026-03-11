# Privacy and Retention Baseline

## Data Classes

- Account/auth data: users, sessions, roles.
- Content and moderation data: feed posts, reports, comments, reactions.
- Ops/audit data: admin audits, queue/task logs, platform analytics events.

## Retention Targets

- `AdminAudit`: retain minimum 365 days.
- `PlatformEvent`: retain minimum 90 days online, archive after.
- `FeedReport` resolution history: retain minimum 365 days.
- Incident and ops logs in `ops/logs`: retain minimum 180 days.

## Privacy Guardrails

- No plaintext secrets in repository docs.
- Production auth requires strong `NEXTAUTH_SECRET`.
- Admin mutations must emit auditable entries.
- User data requests must use the data request playbook.
