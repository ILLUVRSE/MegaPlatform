# Watch Personalization

## Profiles and Cookie
- Auth uses NextAuth Credentials (email-only) at `/auth/signin`.
- Selected profile is persisted in cookie `ILLUVRSE_PROFILE_ID`.
- Profile pages:
1. `/watch/profiles` pick profile.
2. `/watch/profiles/new` create profile.
- Middleware behavior:
1. Logged-in + no profile cookie + protected `/watch/*` page -> redirect to `/watch/profiles`.
2. Logged-out watch browsing is allowed.
3. DB-backed personalization actions return `401` until sign-in/profile selection.

## My List
- Model: `MyListItem` (`profileId`, `mediaType`, `showId` unique tuple).
- APIs:
1. `GET /api/watch/my-list` -> items for selected profile.
2. `POST /api/watch/my-list/toggle` -> add/remove and returns `{ saved }`.
- UI:
1. Show cards expose `+ List` / `✓ Saved`.
2. Show detail page includes Add/Remove My List.
3. `/watch` renders My List rail for authenticated selected-profile sessions.

## Continue Watching
- Model: `WatchProgress` (`profileId`, `episodeId` unique tuple).
- API:
1. `GET /api/watch/progress` -> most recent 20 items with show/episode info.
2. `POST /api/watch/progress` -> upsert `{ episodeId, positionSec, durationSec }`.
- Playback behavior:
1. Logged-in + selected profile: progress syncs to DB every ~5 seconds.
2. Logged-out: localStorage fallback continues to work.
3. Episode player resumes from stored position and displays `Resuming at mm:ss`.
4. Show detail surfaces resume text like `Resume S1E2 at 12:03`.

## Seed Notes
- Seed creates users (`admin@illuvrse.local`, `user@illuvrse.local`).
- Seed creates profiles (`Ryan`, `Kids`) and sample My List + Watch Progress rows when seeded shows/episodes exist.
