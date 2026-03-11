# Phase 168 - Fraud-Adaptive Reward Guardrails

- Policy: `ops/governance/fraud-adaptive-reward-guardrails.json`
- Runtime: `apps/web/lib/fraudAdaptiveRewardGuardrails.ts`
- API: `POST /api/admin/finance/rewards/fraud-guardrails/evaluate`

Reward flows now throttle or halt based on fraud policy conditions.
