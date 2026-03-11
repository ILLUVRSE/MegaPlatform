# Motion System v1

Phase 54 introduces reusable motion primitives with reduced-motion safe defaults.

## Shared primitives

- `apps/web/lib/ui/motion.ts`
  - `enterFadeUp`
  - `enterFade`
  - `hoverLift`
  - `pressScale`

## CSS contract

- Keyframes and utility classes are defined in `apps/web/app/globals.css`.
- Animations use tokenized timing/easing from `packages/ui/src/tokens.css`.
- `motion-reduce:*` fallbacks disable decorative movement for accessibility.

## Baseline adoption

- Header uses fade-in transition.
- Platform Hub and Games catalog cards use consistent enter/hover/press motion.
