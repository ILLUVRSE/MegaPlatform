# Intent-Aware Session Planner

Phase 143 adds an intent-aware session planner that combines explicit and inferred intent signals with policy-safe fallback behavior.

## Scope
- Planner policy: `ops/governance/intent-aware-session-planner.json`
- Runtime planner: `apps/web/lib/intentAwareSessionPlanner.ts`
- Admin API: `POST /api/admin/trust/sessions/plan`

## Behavior
- Blends explicit intents and high-confidence inferred intents into ranked module plans.
- Maps intents to modules via policy and filters by currently available surfaces.
- Applies fallback sequencing and risk-based recommendation capping for safe defaults.
