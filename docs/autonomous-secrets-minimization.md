# Autonomous Secrets Minimization

Phase 137 adds least-privilege secret scoping controls for autonomous tasks.

## Scope
- Secrets minimization policy: `ops/governance/autonomous-secrets-minimization.json`
- Runtime evaluator: `apps/web/lib/autonomousSecretsMinimization.ts`
- Admin API: `POST /api/admin/security/secrets/minimize`

## Behavior
- Enforces max secret count per task and TTL caps.
- Rejects out-of-policy or wildcard scopes when disallowed.
- Returns masked secret metadata with explicit policy violations.
