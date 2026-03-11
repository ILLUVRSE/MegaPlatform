# Cross-Format Continuity Engine

Phase 144 adds a policy-bound continuity evaluator for cross-surface transitions across watch, shorts, games, and narrative flows.

## Scope
- Continuity policy: `ops/governance/cross-format-continuity-engine.json`
- Runtime continuity evaluator: `apps/web/lib/crossFormatContinuity.ts`
- Admin API: `POST /api/admin/trust/continuity/cross-format/evaluate`

## Behavior
- Verifies required context keys are preserved during surface transitions.
- Enforces maximum idle-time windows for continuity-safe context handoff.
- Returns coherent/incoherent transition outcomes with missing-state evidence.
