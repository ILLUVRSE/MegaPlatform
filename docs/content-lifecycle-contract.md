# Content Lifecycle Contract v1 (Phase 24)

Canonical content lifecycle for ILLUVRSE content entities.

## Lifecycle States
- `DRAFT`
- `PROCESSING`
- `REVIEW`
- `PUBLISHED`
- `REJECTED`
- `ARCHIVED`

Source: `apps/web/lib/contentLifecycle.ts`

## Transition Rules

Allowed transitions:
- `DRAFT` -> `PROCESSING`, `REVIEW`, `ARCHIVED`
- `PROCESSING` -> `REVIEW`, `REJECTED`, `ARCHIVED`
- `REVIEW` -> `PUBLISHED`, `REJECTED`, `ARCHIVED`
- `PUBLISHED` -> `ARCHIVED`
- `REJECTED` -> `DRAFT`, `ARCHIVED`
- `ARCHIVED` -> (none)

Enforcement helper:
- `assertValidTransition(from, to)`

## API Enforcement Points

- `POST /api/studio/content/[id]/request-publish`
- `POST /api/studio/content/[id]/reject`
- `POST /api/studio/content/[id]/publish`

Each route resolves current state and enforces transition validity through shared lifecycle helpers.

## Publish Target Resolution

`resolveRequestPublishState(contentType, hasVideoAsset)`
- Video-required types without required assets route to `PROCESSING`
- Others route to `REVIEW`

## Test Coverage

- `apps/web/tests/unit/content-lifecycle.test.ts`

## Follow-up

- Extend lifecycle enforcement to all studio project publish paths where direct `ShortPost` creation bypasses `ContentItem` transitions.
