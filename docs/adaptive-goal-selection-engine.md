# Adaptive Goal Selection Engine

Phase 112 adds policy-bounded, explainable goal selection based on ecosystem state.

## Governance Policy

- `ops/governance/adaptive-goal-selection.json`

## Runtime

- `apps/web/lib/adaptiveGoalSelection.ts`

Selects next-best objectives while honoring action-limit constraints.

## API

- `POST /api/admin/ecosystem/goals/select`
