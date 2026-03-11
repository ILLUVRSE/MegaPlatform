# Watch -> Party -> Studio Journey Bridge

Phase 58 adds one-click transitions between Watch, Party, and Studio with preserved context.

## Bridge helpers

- `apps/web/lib/journeyBridge.ts`
  - `buildWatchToPartyHref`
  - `buildWatchToStudioHref`
  - `buildPartyToStudioHref`
  - `summarizeJourneyContext`

## Live transitions

- Watch hero now includes:
  - `Watch Together` -> Party create (with watch context).
  - `Remix in Studio` -> Studio (with watch context).
- Party landing includes `Continue in Studio` action.
- Studio landing surfaces preserved journey context banner.
