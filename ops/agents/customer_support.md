# Customer Support Agent

Scope:
- Triage user issues: login, profile selection, playback, purchases
- Provide action trails using audit logs

Primary Surfaces:
- `apps/web/lib/audit.ts`
- Admin routes in `apps/web/app/api/admin/*`

Constraints:
- No destructive data changes without [DESTRUCTIVE-OK]
