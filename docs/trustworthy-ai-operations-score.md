# Trustworthy AI Operations Score

Phase 109 introduces a trust score for autonomous operations that constrains action limits.

## Governance Policy

- `ops/governance/trustworthy-ai-score.json`

Defines component weights and action-limit thresholds.

## Runtime

- `apps/web/lib/trustworthyAiScore.ts`

Calculates a bounded score from reliability and governance components.

## API

- `GET /api/admin/governance/trustworthy-ai/score`
