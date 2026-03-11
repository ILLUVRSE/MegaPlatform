# Platform Domain Map (Phase 21)

Canonical domain boundaries for ILLUVRSE MegaPlatform.

Source of truth:
- `ops/governance/domain-map.json`

## Domains

### Identity and Access (`identity`)
- Owner: Platform Core / Auth
- Scope: authentication, principal resolution, RBAC, session controls.
- Primary code paths:
  - `apps/web/app/api/auth`
  - `apps/web/app/auth`
  - `apps/web/lib/auth.ts`
  - `apps/web/lib/authz.ts`
  - `apps/web/lib/rbac.ts`
  - `apps/web/middleware.ts`

### Content and Media Lifecycle (`content`)
- Owner: Content Platform
- Scope: studio authoring, processing pipeline, media catalog, storage lifecycle.
- Primary code paths:
  - `apps/web/app/studio`
  - `apps/web/app/api/studio`
  - `apps/web/app/api/uploads`
  - `apps/web/app/api/media`
  - `apps/web/lib/contentLifecycle.ts`
  - `packages/storage/src`

### Engagement and Discovery (`engagement`)
- Owner: Growth and Discovery
- Scope: home feed, shorts discovery, interactions, ranking telemetry.
- Primary code paths:
  - `apps/web/app/home`
  - `apps/web/app/shorts`
  - `apps/web/app/api/feed`
  - `apps/web/app/api/shorts`
  - `apps/web/app/api/games/telemetry`
  - `apps/web/lib/feedRanking.ts`
  - `apps/web/lib/shortsRanking.ts`

### Economy and Entitlements (`economy`)
- Owner: Monetization
- Scope: purchases, premium access, entitlements, monetization operations.
- Primary code paths:
  - `apps/web/app/admin/monetization`
  - `apps/web/app/api/admin/monetization`
  - `apps/web/app/api/shorts/[id]/purchase`
  - `apps/web/lib/watchEntitlements.ts`
  - `apps/web/lib/platformAnalytics.ts`

### Operations and Automation (`ops`)
- Owner: Ops Engineering
- Scope: autonomous queues, director/specialist loops, operational orchestration.
- Primary code paths:
  - `ops`
  - `packages/agent-manager/src`
  - `packages/watch-scheduler/src`
  - `docs/ops_brain`
  - `scripts/shipcheck.mjs`

### Governance, Risk, and Compliance (`governance`)
- Owner: Governance and Trust
- Scope: policy manifests, compliance evidence, launch/deploy/finance/SLO gates.
- Primary code paths:
  - `ops/governance`
  - `docs/compliance`
  - `apps/web/lib/platformGovernance.ts`
  - `apps/web/app/api/admin/compliance`
  - `apps/web/app/api/admin/deploy`
  - `apps/web/app/api/admin/launch`
  - `apps/web/app/api/admin/finance`
  - `apps/web/app/api/admin/observability`

## Ownership Rules

1. Each primary path in `domain-map.json` has one owner domain.
2. Shared dependencies (e.g., `packages/db`) are allowed, but policy ownership must stay domain-specific.
3. New top-level platform capabilities must be added to `domain-map.json` before broad rollout.
4. `pnpm governance:check` validates domain map structure and path ownership collisions.

## Current Ambiguities to Resolve Next

- Phase 22: event taxonomy is still spread across modules and needs unification.
- Phase 23: user/profile/anon identity rules are partially duplicated between watch/feed/party paths.
- Phase 29: capability matrix should be generated from this domain map + API registry.
