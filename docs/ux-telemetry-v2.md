# UX Telemetry Instrumentation v2

Phase 60 adds granular UX telemetry for onboarding drop-off/friction diagnostics.

## Event taxonomy additions

- `ux_hesitation`
- `ux_rage_click`
- `ux_dropoff`

Added in `apps/web/lib/platformEvents.ts` and accepted by `/api/platform/events`.

## Runtime instrumentation

- `apps/web/lib/uxTelemetry.ts` provides helper emitters.
- Onboarding route emits:
  - hesitation signal (delayed first-action inactivity).
  - dropoff signal (unload before completion).
  - rage-click signal (repeated completion intent).

## Admin diagnostics

- Endpoint: `GET /api/admin/ux/diagnostics`
- Returns 7d onboarding funnel and friction event counts:
  - started / first action / completed
  - completion and first-action rates
  - hesitation / rage-click / dropoff totals
