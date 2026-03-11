# Surface and Card Grammar

Phase 55 standardizes reusable surface primitives for feed/watch/games.

## Shared components

- `apps/web/components/ui/SurfaceCard.tsx`
  - Tone variants: `default`, `muted`, `dark`.
  - Base contract: rounded surface, border, background, depth.
- `apps/web/components/ui/SectionHeader.tsx`
  - Shared eyebrow/title/description structure.

## Adoption baseline

- Feed cards now render inside `SurfaceCard`.
- Games catalog cards now render inside `SurfaceCard`.
- Watch poster card media frame now uses `SurfaceCard`.
- Games catalog heading now uses `SectionHeader`.

This grammar is the baseline for future rails/media/action-zone consistency passes.
