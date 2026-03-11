# Onboarding Journey Redesign

Phase 57 introduces a measurable first-session onboarding path.

## User flow

- Home prompt (`OnboardingPrompt`) surfaces onboarding for first session users.
- Guided route: `GET /onboarding`.
- Steps focus on cross-ecosystem value:
  - Watch
  - Party
  - Studio

## Measurement

- Endpoint: `POST /api/onboarding/complete`
- Tracked events:
  - `onboarding_started`
  - `onboarding_first_action`
  - `onboarding_completed`

These events are persisted to `PlatformEvent` and used for completion/first-action diagnostics.
