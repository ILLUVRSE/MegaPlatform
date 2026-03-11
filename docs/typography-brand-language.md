# Typography and Brand Language

Phase 52 standardizes shared text hierarchy so shell surfaces stop using ad-hoc type classes.

## Shared contract

- Utility map: `apps/web/lib/ui/typography.ts`
- Primary styles:
  - `eyebrow`: utility labels and context chips.
  - `titleHero`: primary hero headlines.
  - `titleSection`: section headings.
  - `titleCard`: card titles.
  - `body`: muted descriptive copy.
  - `bodyStrong`: primary explanatory copy.

## Voice guidance

- Keep headlines short and action-oriented.
- Use module names directly (`Watch`, `Party`, `Studio`) rather than generic labels.
- Favor declarative copy over hype language in cards and CTAs.

## Adoption baseline

- Global header brand + CTA now use shared typography styles.
- Platform hub headings and card text now consume shared typography utilities.
