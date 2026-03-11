# Accessibility Hardening v1

Phase 59 raises baseline a11y quality for core shell journeys.

## Improvements shipped

- Skip link added to app shell (`Skip to main content`).
- Global header now uses explicit navigation landmarks/labels.
- Feed post action menu now exposes `aria-haspopup`, `aria-expanded`, menu roles, and menu-item roles.
- Watch hero carousel now exposes carousel semantics with active indicator state.
- Existing focus-visible ring contract remains enforced in `globals.css`.

## Baseline target

- Keyboard navigation for primary shell controls.
- Focus visibility for interactive controls.
- Semantics for global nav, menu actions, and carousel indicators.
