# Agents Memory

The agent framework persists runtime memory under `docs/ops_brain/memory/<agent>/<namespace>.jsonl`.

## Storage Model

- Per-agent namespaces isolate interaction streams such as `interactions`, `planning`, or `handoff`.
- Each record stores a deterministic `sequence`, `at`, optional `expiresAt`, and `tokenUsage`.
- Writes prune expired records and evict older entries beyond the namespace cap to keep storage bounded.

## Replay

- Replay is deterministic by sorting on `at`, then `sequence`, then `runId`.
- Replay a run:
  - `pnpm --filter @illuvrse/agent-manager replay -- --actor Director --run-id <id>`
- Replay the last N interactions:
  - `pnpm --filter @illuvrse/agent-manager replay -- --actor Director --last 10`

## Cost Controls

- Daily token usage is derived from persisted memory records.
- `assertAgentBudget` still hard-stops on max actions, but token overages soft-fail instead of throwing.
- Warnings and soft-fail alerts are appended to `docs/ops_brain/alerts/agent-cost-controls.jsonl`.

## Operational Notes

- TTL defaults to 30 days unless callers override it.
- Namespace compaction currently happens opportunistically during reads and writes.
