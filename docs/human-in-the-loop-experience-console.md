# Human-in-the-Loop Experience Console

Phase 150 adds an operator console API for inspecting, approving, and overriding high-impact UX actions.

## Scope
- Console policy: `ops/governance/human-in-the-loop-experience-console.json`
- Console action store: `ops/logs/human-in-the-loop-experience-console.json`
- Runtime console manager: `apps/web/lib/humanLoopExperienceConsole.ts`
- Admin APIs:
  - `GET /api/admin/trust/experience/console/actions`
  - `POST /api/admin/trust/experience/console/actions`

## Behavior
- Persists high-impact UX action proposals and operator decisions.
- Requires human approval paths for configured high-impact action classes.
- Supports deterministic approve/override state transitions with operator metadata.
