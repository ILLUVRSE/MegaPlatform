# Home Feed (Wall + Shorts)

## Feed Type Mapping
- `SHORT`: references `ShortPost` video/image from Studio Shorts.
- `MEME`: references `ShortPost` with `mediaType=IMAGE`.
- `WATCH_EPISODE`: links to `/watch/episode/[id]`.
- `WATCH_SHOW`: links to `/watch/show/[slug]`.
- `LIVE_CHANNEL`: links to `/watch/live/[channelId]`.
- `GAME`: links to `/games/[slug]` or route/url from `gameKey`.
- `LINK`: generic URL card.
- `UPLOAD`: generic upload URL card.
- `TEXT`: caption-only post.
- `SHARE`: repost of another `FeedPost` via `shareOfId`.

## API Routes
- `GET /api/feed?cursor=&mode=wall|shorts`
- `POST /api/feed`
- `POST /api/feed/[id]/like`
- `GET /api/feed/[id]/comments?cursor=`
- `POST /api/feed/[id]/comments`
- `POST /api/feed/[id]/share`
- `POST /api/feed/[id]/report`

## Admin Moderation
- `POST /api/admin/feed/[id]/hide`
- `POST /api/admin/feed/[id]/unhide`
- `POST /api/admin/feed/[id]/shadowban`
- `POST /api/admin/feed/[id]/pin`
- `POST /api/admin/feed/[id]/feature`
- `GET /api/admin/feed/reports?status=open|resolved`
- `POST /api/admin/feed/reports/[reportId]/resolve`
- `GET /api/admin/feed/posts`
- `PUT /api/admin/feed/posts/[id]`

UI pages:
- `/admin/feed/posts`
- `/admin/feed/reports`
- `/admin/feed/settings`

## Anonymous Identity
- Cookie: `ILLUVRSE_ANON_ID`
- Created and persisted for anonymous like/comment/share/report actions.

## Future Work
- Follow graph + notifications.
- Expanded reactions and threaded comments.
- ML-assisted trust/safety classifier tuning beyond rule-based automation.

## Shorts Mode Behavior
- `mode=shorts` now serves `FeedPost` entries (`SHORT`/`MEME`) linked to `ShortPost`.
- Ranking blends recency, engagement, editorial flags (pin/feature), and purchase traction.
- Moderation gating excludes hidden/shadowbanned and unresolved-report-threshold content.

## Wall Mode Behavior
- `mode=wall` serves `FeedPost` entries excluding Shorts-specific types.
- Ranking blends recency, engagement, editorial controls, and viewer affinity (recent likes/comments by type).
- Trust-safety gates suppress hidden/shadowbanned content and auto-hide high-unresolved-report posts.

## Trust-Safety Automation
- New reports trigger per-post unresolved/unique-reporter aggregation.
- Rule-based automation can auto-hide and auto-shadowban posts when thresholds are crossed.
- Admin feed settings now display active ranking and moderation thresholds.
