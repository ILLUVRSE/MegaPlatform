# Control Plane v2 Baseline (Phases 31-40)

This is a baseline control-surface document, not a claim that the repo contains a full autonomous operations platform.

## Implemented Baseline Components

1. Role spec + capability manifests
- `ops/governance/agent-roles.json`
- `ops/governance/agent-capabilities.json`

2. Safe-action guardrails and approval checkpoints
- `ops/governance/agent-safe-actions.json`
- `ops/governance/agent-approval-checkpoints.json`

3. Budgets + reliability targets
- `ops/governance/agent-budgets.json`
- `ops/governance/agent-slos.json`

4. Task DSL schema
- `docs/ops_brain/task-dsl.schema.json`

5. Runtime hooks
- Capability/safe-action/budget assertions in Director/Specialist execution paths.
- Agent memory append to `docs/ops_brain/memory/<agent>/<namespace>.jsonl` with TTL/eviction.
- Handoff artifacts in `docs/ops_brain/handoff/*.md`.
- Replay tool: `pnpm --filter @illuvrse/agent-manager replay -- --actor <actor> --run-id <id>` or `--last <n>`.
- Token budget warnings and soft-fail alerts in `docs/ops_brain/alerts/agent-cost-controls.jsonl`.

## Notes

- Approval checkpoints are policy-defined and ready to enforce for high-risk actions.
- Current specialist action set remains intentionally narrow (`Quality/Analytics`, `Ops/SRE`) with stronger governance wrappers.
- In practice the repo currently exposes a local-first task queue, manifests, logs, and replay hooks rather than a broad always-on autonomous control plane.
