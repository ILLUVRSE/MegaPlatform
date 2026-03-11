# Continuous Red-Team Simulator

Phase 131 adds a deterministic red-team simulator for adversarial resilience checks.

## Scope
- Simulator policy: `ops/governance/continuous-red-team-simulator.json`
- Runtime simulator: `apps/web/lib/continuousRedTeamSimulator.ts`
- Admin API: `POST /api/admin/security/red-team/simulate`

## Behavior
- Scores adversarial scenarios into severity bands.
- Auto-blocks configured high-risk severity classes.
- Surfaces threshold-matching findings for continuous security review.
