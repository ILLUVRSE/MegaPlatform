# Resilience Certification v1

Phase 140 introduces certification logic for resilience across fault and chaos coverage classes.

## Scope
- Certification policy: `ops/governance/resilience-certification-v1.json`
- Runtime certifier: `apps/web/lib/resilienceCertification.ts`
- Admin API: `POST /api/admin/security/resilience/certify`

## Behavior
- Verifies required incident-class evidence coverage.
- Enforces minimum pass-rate and critical-finding thresholds.
- Produces final certification status with explicit blocker diagnostics.
