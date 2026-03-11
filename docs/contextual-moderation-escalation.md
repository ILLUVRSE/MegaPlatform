# Contextual Moderation Escalation

Phase 146 adds context-chain-aware moderation escalation so severity is computed across related events, not isolated incidents.

## Scope
- Moderation escalation policy: `ops/governance/contextual-moderation-escalation.json`
- Runtime evaluator: `apps/web/lib/contextualModerationEscalation.ts`
- Admin API: `POST /api/admin/trust/moderation/contextual/escalate`

## Behavior
- Applies policy-defined amplification weights for contextual moderation signals.
- Computes effective severity across event context chains.
- Produces deterministic decisions (`allow`, `review`, `escalate`, `hard_block`).
