# Autonomous Sponsorship Compliance

Phase 155 adds sponsorship disclosure enforcement for autonomous publishing flows.

## Scope
- Sponsorship policy: `ops/governance/autonomous-sponsorship-compliance.json`
- Runtime evaluator: `apps/web/lib/autonomousSponsorshipCompliance.ts`
- Admin API: `POST /api/admin/creator/compliance/sponsorship/evaluate`

## Behavior
- Detects undeclared sponsored placements and blocks non-compliant content.
- Enforces required sponsorship disclosure markers.
- Applies hard limits for hidden sponsor mention counts.
