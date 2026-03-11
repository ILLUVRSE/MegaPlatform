# Platform Hardening Report

Date: March 7, 2026

## Scope

This pass hardened the `apps/web` surface across architecture, authorization, distributed rate limiting, schema safety, and package boundaries while preserving existing route compatibility.

## Architectural Changes

### Domain modularization

Added explicit domain entry points under `apps/web/src/domains`:

- `platform-core`
- `watch`
- `party`
- `studio`
- `creator`
- `admin`

`platform-core` now owns the shared enforcement layer:

- authorization source of truth
- privileged-route middleware policy
- distributed rate limiting
- platform-shared embedded app components

Selected shared UI and service code was moved behind domain-owned modules with compatibility shims left in place for existing imports:

- embedded platform app shell
- apps directory grid
- party local storage helpers
- creator game catalog
- minigame frame and HUD

This reduces direct cross-surface imports and establishes a stable path for continued extraction without a large route rewrite in one pass.

### Authorization hardening

RBAC enforcement is now centralized in two layers:

- Edge middleware gates every privileged route family before handler execution.
- Server-side auth helpers remain the source of truth for principal resolution and ownership checks.

New middleware coverage now includes:

- `/api/admin/**`
- `/admin/**`
- `/api/studio/**`
- `/api/uploads/**`
- `/api/storage/upload/**`
- `/api/party/**`
- `/api/creator/control-center/**`
- `/api/creator/portability/**`
- `/api/onboarding/complete/**`
- existing watch/profile protections

This closes gaps where privileged write APIs relied only on per-route checks and ensures a consistent first-line authorization policy.

### Distributed rate limiting

`apps/web/lib/rateLimit.ts` now delegates to a Redis-backed implementation.

Behavior:

- Uses Redis counters with TTL for distributed enforcement.
- Requires Redis in production unless explicitly forced to memory mode.
- Falls back to local memory only in non-production if Redis is unavailable.

This replaces the previous single-process bucket map as the default enforcement path.

## Database Hardening

Added indexes and constraints for the requested hot paths:

### Participants

- composite indexes on `partyId, joinedAt`
- composite indexes on `userId, joinedAt`

### Audit logs

- composite indexes on `adminId, createdAt`
- composite indexes on `action, createdAt`
- non-blank action check constraint

### Short posts

- unique `projectId` linkage
- composite indexes on `createdById, publishedAt`
- composite indexes on `mediaType, publishedAt`
- premium pricing check constraint

### Moderation queues

The operational moderation queue in the current schema is represented by `FeedReport`. Added:

- composite indexes on `postId, resolvedAt`
- composite indexes on `reporterId, createdAt`
- composite indexes on `resolvedAt, createdAt`
- reporter presence check constraint (`reporterId` or `anonId`)

## Boundary Violations Removed

Removed the direct cross-surface imports that coupled:

- party -> games app components
- studio -> party app local storage
- root/module pages -> route-layer shared components
- games routes -> app-local data/components when domain-owned modules were more appropriate

The boundary checker now also fails:

- non-route code importing from `@/app/*`
- route surfaces importing another top-level app surface directly

## Tests Added

Added unit coverage for:

- Redis-backed distributed rate limiting
- middleware authorization policy and privileged route matching

## Follow-up Recommendations

- Continue migrating remaining `apps/web/lib/*` service files into the new domain roots and tighten path alias rules around domain public APIs.
- Replace remaining per-route `requireAdmin()` response boilerplate with route wrappers now that middleware coverage is centralized.
- Add partial indexes for moderation workloads directly in SQL if queue volume grows enough to justify unresolved-only filtering.
