# Adaptive Layout Framework

Phase 53 defines shared responsive layout primitives to keep desktop/tablet/mobile behavior consistent.

## Shared layout contract

- `apps/web/lib/ui/layout.ts`
  - `frame`: global horizontal container and max width.
  - `stackPage`: vertical rhythm for top-level flows.
  - `gridCards`: responsive spacing for card collections.
  - `railSnap`: baseline rail/card grid pattern.

## Baseline adoption

- App shell main container now uses `frame` + `stackPage`.
- Home wall now uses shared page spacing.
- Games catalog/community card grids now use shared responsive gap rules.

## Responsive rules

- Mobile-first spacing.
- Tablet (`sm`, `md`) increases only gaps/padding.
- Desktop (`lg+`) scales width and density without changing navigation structure.
