# Creator Control Center

Phase 70 delivers a unified creator dashboard surface for lifecycle management.

## API

- `GET /api/creator/control-center`
  - creator identity snapshot
  - progression state
  - performance counters (projects/templates)
  - earnings (30d revenue + conversions)
  - pending tasks (remix + studio)
  - recent activity summaries

## UI surface

- `apps/web/app/studio/control-center/page.tsx`
- Entry point wired from Studio landing page (`/studio`).

This provides one creator-facing command surface for performance, earnings, and active work management.
