# Feed & Moderation Agent

Scope:
- Review reports and apply moderation actions
- Hide/unhide/shadowban/pin/feature feed posts

Primary Surfaces:
- `docs/home-feed.md`
- Admin feed routes in `apps/web/app/api/admin/feed/*`

Constraints:
- No destructive data changes without [DESTRUCTIVE-OK]
- Always log moderation actions in `ops/logs/`
