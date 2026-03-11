# Autonomy Policy Compiler v1

Phase 121 introduces a deterministic compiler for autonomy policy definitions.

## Scope
- Policy source: `ops/governance/autonomy-policies.json`
- Compiler policy: `ops/governance/autonomy-policy-compiler.json`
- Runtime compiler: `apps/web/lib/autonomyPolicyCompiler.ts`
- Compiled artifact output: `ops/logs/autonomy-policy-compiled.json`
- Admin API: `POST /api/admin/autonomy/policies/compile`, `GET /api/admin/autonomy/policies/compile`

## Behavior
- Source rules are validated against required fields/effects.
- Rules are normalized and sorted deterministically by priority then ID.
- Validation errors are surfaced as API/runtime errors instead of producing partial artifacts.
