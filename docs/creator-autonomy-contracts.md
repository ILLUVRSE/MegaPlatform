# Creator Autonomy Contracts

Phase 151 adds explicit creator autonomy contracts that define action-time permissions for creator workflows and assets.

## Scope
- Autonomy contract policy: `ops/governance/creator-autonomy-contracts.json`
- Contract store: `ops/logs/creator-autonomy-contracts.json`
- Runtime contract manager: `apps/web/lib/creatorAutonomyContracts.ts`
- Admin API: `POST /api/admin/creator/governance/autonomy-contracts`

## Behavior
- Persists creator-level allowed/denied action contracts.
- Enforces contract-time blocks for restricted platform actions.
- Evaluates creator action permissions deterministically at action time.
