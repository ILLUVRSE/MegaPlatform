# Creator Identity Layer

Phase 61 introduces durable creator identity metadata and links studio ownership to creator entities.

## Data model

- New model: `CreatorProfile`
  - `userId` (unique owner)
  - `handle` (unique public identity key)
  - `displayName`, `reputationScore`, `level`, `badges`
- `StudioProject.creatorProfileId` now links project ownership to creator profile.

## Runtime behavior

- Shared resolver: `apps/web/lib/creatorIdentity.ts` (`ensureCreatorProfile`).
- Studio project creation auto-resolves/creates creator profile.
- Studio publish uses creator profile display name for feed authorship metadata.
