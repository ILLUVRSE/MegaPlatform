# Identity Contract v1 (Phase 23)

Canonical identity semantics across ILLUVRSE shell APIs.

## Source Files
- `apps/web/lib/identity.ts`
- `apps/web/lib/authz.ts`
- `apps/web/lib/anon.ts`
- `apps/web/lib/watchProfiles.ts`
- `apps/web/middleware.ts`

## Identity Axes

1. Authenticated user identity
- Canonical key: `userId`
- Source: NextAuth session -> principal (`getPrincipal` / `requireSession`)

2. Anonymous identity
- Canonical key: `anonId`
- Cookie: `ILLUVRSE_ANON_ID`
- Source: signed anon cookie helpers in `lib/anon.ts`

3. Profile identity (watch context)
- Canonical key: `profileId`
- Cookie: `ILLUVRSE_PROFILE_ID`
- Source: watch profile cookie parser in `lib/watchProfiles.ts`

## Canonical Resolution

Use `resolveIdentityContext({ request, principal })` to derive:
- `userId`
- `role`
- `anonId`
- `profileId`
- `mode` (`authenticated_profile`, `authenticated_no_profile`, `anonymous`)

## Middleware Alignment

- Middleware now references `PROFILE_COOKIE` constant from `lib/watchProfiles.ts`.
- Watch routes continue enforcing profile selection for signed-in users except exempt paths.

## Rules of Use

1. Use principal (`requireSession`) for authorization decisions.
2. Use `profileId` for watch-progress and watch-list personalization context.
3. Use `anonId` for unauthenticated engagement continuity and telemetry continuity.
4. Do not treat `anonId` as an authorization primitive.

## Follow-up (Phase 24+)

- Migrate watch/feed route handlers to consume `resolveIdentityContext` directly.
- Add route-level helper wrappers to reduce repeated identity parsing logic.
