# Cross-App Inbox and Task Queue

Phase 303 adds a shared inbox for session resume, social actions, creator tasks, and platform prompts.

## Runtime

- Persistence: `PlatformNotification`
- Runtime: `apps/web/lib/platformInbox.ts`
- API: `GET/POST /api/inbox`
- Home surface: `PlatformControlDeck`

## Seeded sources

- Session graph
- Party
- Creator control center
