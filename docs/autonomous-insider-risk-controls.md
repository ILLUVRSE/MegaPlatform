# Autonomous Insider-Risk Controls

Phase 134 adds insider-risk control evaluation for privileged autonomous operations.

## Scope
- Insider-risk policy: `ops/governance/autonomous-insider-risk-controls.json`
- Runtime controls evaluator: `apps/web/lib/insiderRiskControls.ts`
- Admin API: `POST /api/admin/security/insider-risk/evaluate`

## Behavior
- Scores actor/action risk with privilege and action-rate adjustments.
- Requires dual approval for elevated-risk or privileged operations.
- Blocks operations when insider-risk thresholds are exceeded.
