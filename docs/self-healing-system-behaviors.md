# Self-Healing System Behaviors

Phase 116 adds automatic detection of regressions and rollback-safe remediation planning.

## Governance Policy

- `ops/governance/self-healing-behaviors.json`

## Runtime

- `apps/web/lib/selfHealing.ts`

Evaluates regressions and outputs healing actions with rollback safety metadata.

## API

- `POST /api/admin/ecosystem/self-heal/evaluate`
