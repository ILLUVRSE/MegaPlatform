# Agent Operating System Baseline (Phases 31-40)

This document defines the baseline policy and tasking artifacts for autonomous operations.
It does not imply a broad production-grade autonomous runtime; the current repo mainly implements bounded local queueing, manifests, and guardrail checks.

## Manifests
- Role specs: `ops/governance/agent-roles.json`
- Capability map: `ops/governance/agent-capabilities.json`
- Safe-action policy: `ops/governance/agent-safe-actions.json`
- Approval checkpoints: `ops/governance/agent-approval-checkpoints.json`
- Agent budgets: `ops/governance/agent-budgets.json`
- Agent SLOs: `ops/governance/agent-slos.json`
- Task DSL schema: `docs/ops_brain/task-dsl.schema.json`

## Runtime Hooks
- Guardrails + capability checks in specialist/director flows
- Memory log append on run completion/failure
- Handoff artifact persisted per created task
- Replay tool for memory traces

## Safety
- High-risk actions are denied by default (`blocked: true`) in safe-actions manifest.
- Human approvals are required for deploy/policy/destructive migration actions.

## Current Reality
- Runtime execution remains narrow and local-first rather than a generalized autonomous control plane.
- The main concrete surface today is the admin ops queue in `apps/web/app/admin/ops` plus supporting manifests/logs under `ops/` and `docs/ops_brain/`.
