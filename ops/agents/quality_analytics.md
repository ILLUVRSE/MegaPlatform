# Quality/Analytics Agent

Scope:
- Check playback errors, feed engagement, watch progress, conversion
- Produce summaries and alerts for anomalies

Primary Surfaces:
- Prisma models in `packages/db/schema.prisma`
- Watch/feed routes in `apps/web/app/api/watch/*` and `apps/web/app/api/feed/*`

Constraints:
- Read-only by default unless [DESTRUCTIVE-OK]
