# Design System v2

Phase 60 establishes a dedicated `@illuvrse/design-system` package for accessible primitives, theme tokens, and Storybook-ready component stories.

## Scope

- Accessible primitives audited for WCAG 2.1 A/AA baseline:
  - `Button`
  - `TextInput`
  - `Modal`
  - `Nav`
- Theme token model covering:
  - color
  - spacing
  - typography
  - radius
  - shadow
- Runtime theme switching through `ThemeProvider` and `ThemeToggleButton`.
- Storybook config with accessibility addon registration and component stories.
- Axe-based tests for the primary components.

## Accessibility notes

- Buttons preserve visible focus styling and avoid icon-only unlabeled actions.
- Text inputs require an explicit label and wire hint/error text through `aria-describedby`.
- Modals render `role="dialog"` with `aria-modal`, labelled title, optional description, close action, and Escape-to-close support.
- Navigation renders a labeled `nav` landmark and uses `aria-current="page"` for the active route.

## Theme tokens

`packages/design-system/src/tokens.ts` contains light and dark theme variants. Tokens are exposed as structured TypeScript objects and translated into CSS custom properties at runtime.

## Storybook

Storybook config lives in `packages/design-system/.storybook/main.js` and `packages/design-system/.storybook/preview.js`.

In this workspace, the package-local `storybook` script performs CI validation of config and stories because Storybook dependencies are not installed yet. Once Storybook packages are added to the workspace, the same config files can be used by a standard Storybook runtime.
