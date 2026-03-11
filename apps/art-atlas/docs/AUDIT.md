# Bingham Atlas v2 Audit and Fix Pass

Date: 2026-03-02

1. Dataset schema mismatch with requested fields.
   - Fix: Migrated to structured artwork schema with `image {url,width,height}`, `rights`, `creditLine`, `lastVerified`, and `confidence`.
2. Missing strict validation against schema and uniqueness.
   - Fix: Added reusable validator in `lib/validate-dataset.ts` and enforced in build via `scripts/validate-data.ts`.
3. Gallery filters were not fully shareable or reload-safe.
   - Fix: Added URL-synced filter state, query serialization, and initialization from search params.
4. Search interaction was immediate and noisy.
   - Fix: Added debounced search in Gallery.
5. Inconsistent UI primitives and visual rhythm.
   - Fix: Added design system components: `Button`, `Input`, `Select`, `Tag`, `Card`, `SectionTitle`, `Skeleton`, `Toast`.
6. Navigation lacked sticky behavior and active-route clarity.
   - Fix: Upgraded header to sticky navigation with `aria-current` highlighting.
7. No persistent theme preference.
   - Fix: Added dark-mode toggle with localStorage persistence and hydration-safe class bootstrapping.
8. Artwork zoom/pan lacked richer controls and keyboard path.
   - Fix: Added wheel zoom, drag pan, double-click zoom, and keyboard-accessible zoom buttons with reset.
9. Timeline readability and scanning were limited.
   - Fix: Grouped timeline by decade using collapsible sections and mini thumbnails.
10. Source and rights content needed print-ready clarity.
    - Fix: Expanded sources page with rights table, explanatory note, and print CSS support.
