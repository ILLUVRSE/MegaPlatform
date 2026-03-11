# Policy-as-Code Engine v2

Phase 101 executes governance policy decisions as machine-evaluable allow/deny rules.

Current reality:
- This is a bounded evaluator plus admin API surface.
- It should not be read as a claim that all governance in the repo runs through one unified production policy runtime.

## Governance Policy

- `ops/governance/policy-engine-v2.json`

The policy file defines:
- `version`
- `defaultEffect`
- ordered `rules` with `scope`, `action`, `effect`, `priority`, and condition predicates.

## Runtime

- `apps/web/lib/policyEngine.ts`

`evaluatePolicyDecision` loads policy definitions and resolves real-time decisions for a requested scope/action with attributes.

## API

- `POST /api/admin/governance/policy/evaluate`

Payload:
- `scope`
- `action`
- `attributes` (object)

Response returns policy decision output with matched rule and final allow/deny effect.
