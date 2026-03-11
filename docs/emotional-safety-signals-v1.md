# Emotional Safety Signals v1

Phase 149 adds an emotional safety signal pipeline to detect harmful engagement patterns and trigger protective controls.

## Scope
- Emotional safety policy: `ops/governance/emotional-safety-signals-v1.json`
- Emotional safety signal store: `ops/logs/emotional-safety-signals-v1.json`
- Runtime signal pipeline: `apps/web/lib/emotionalSafetySignals.ts`
- Admin APIs:
  - `GET /api/admin/trust/emotional-safety/signals`
  - `POST /api/admin/trust/emotional-safety/signals`

## Behavior
- Ingests and stores emotional safety signals with deterministic de-duplication.
- Flags high-severity and protected-pattern signals for protective ranking/exposure controls.
- Exposes read/write APIs for safety operations and governance tooling.
