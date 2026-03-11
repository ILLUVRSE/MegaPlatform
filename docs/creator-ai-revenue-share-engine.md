# Creator-AI Revenue Share Engine

Phase 153 adds a policy-driven revenue split engine for mixed creator/agent contributions.

## Scope
- Revenue share policy: `ops/governance/creator-ai-revenue-share-engine.json`
- Runtime payout calculator: `apps/web/lib/creatorAiRevenueShare.ts`
- Admin API: `POST /api/admin/creator/economy/revenue-share/calculate`

## Behavior
- Computes deterministic creator/agent/platform splits.
- Enforces minimum creator and maximum agent share bounds.
- Requires attribution-weighted contribution inputs when configured.
