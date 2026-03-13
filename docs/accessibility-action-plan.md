# Accessibility Action Plan

## Scope

- Top flows audited: `play`, `watch`, `party`, `studio`
- Audit method: local axe smoke coverage plus targeted semantic assertions

## Fixed in this pass

1. Added explicit labels for party join and party mode form fields.
2. Added explicit labels for studio idea, script, audio, and publish controls.
3. Removed nested interactive controls from watch poster cards.
4. Added stronger `:focus-visible` styling for keyboard users.
5. Added `aria-current` to active watch local navigation.
6. Added carousel button labels and current-state semantics.
7. Added `aria-pressed` semantics to save/list and round selectors.
8. Raised low-contrast secondary text on top dark surfaces.
9. Added status live regions for feedback text that updates asynchronously.
10. Added automated axe checks for the top flow entry components.

## Residual Risks

- Contrast was improved in the main audited surfaces, but adjacent pages under `watch/live`, `watch/show`, and `watch/profiles` still use older muted text tokens.
- Component-level axe coverage catches structural issues, not final rendered regressions from real data combinations or browser-specific focus behavior.

## Follow-up

- Expand the same audit/test pattern to `watch/live`, `watch/show`, and `party/[code]`.
- Add CI execution for `node accessibility/run-audit.mjs --pages=top`.
- Add periodic Lighthouse browser runs once a stable local or CI runner exists in-repo.
