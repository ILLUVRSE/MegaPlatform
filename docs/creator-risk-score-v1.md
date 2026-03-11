# Creator Risk Score v1

Phase 157 adds a creator operational risk score based on quality, safety, and fraud indicators.

## Scope
- Risk scoring policy: `ops/governance/creator-risk-score-v1.json`
- Runtime scorer: `apps/web/lib/creatorRiskScore.ts`
- Admin API: `POST /api/admin/creator/risk/score`

## Behavior
- Computes weighted risk from quality, safety, and fraud indicators.
- Produces low/medium/high risk tiers for policy decisions.
- Returns escalation action guidance for moderation and distribution controls.
