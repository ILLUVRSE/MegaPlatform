# Deception and Manipulation Detection Layer

Phase 133 adds a signal-weighted deception/manipulation detector for autonomous security hardening.

## Scope
- Detection policy: `ops/governance/deception-manipulation-detection.json`
- Runtime detector: `apps/web/lib/deceptionDetection.ts`
- Admin API: `POST /api/admin/security/deception/detect`

## Behavior
- Computes weighted risk score from adversarial signal inputs.
- Flags manipulative patterns above threshold and escalates severe cases.
- Returns top contributing signals for explainable remediation.
