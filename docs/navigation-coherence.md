# Navigation Coherence Pass

Phase 56 unifies global/local navigation metadata and usage.

## Navigation contract

- `apps/web/lib/navigation.ts`
  - `getGlobalNavItems(isAdmin)`
  - `WATCH_LOCAL_NAV`
  - `GAMES_LOCAL_NAV`

## Adoption baseline

- Header global nav now renders from shared global nav model.
- Watch local sticky nav now renders from `WATCH_LOCAL_NAV`.
- Games page local nav now renders from `GAMES_LOCAL_NAV`.

This keeps route/action placement consistent while preserving surface-specific styling.
