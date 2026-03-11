# Attribution Graph v2

Phase 154 adds a fine-grained human/agent contribution graph for payout, rights, and audit workflows.

## Scope
- Attribution graph policy: `ops/governance/attribution-graph-v2.json`
- Attribution graph store: `ops/logs/attribution-graph-v2.json`
- Runtime graph manager: `apps/web/lib/attributionGraphV2.ts`
- Admin APIs:
  - `GET /api/admin/creator/attribution/graph?subjectId=<id>`
  - `POST /api/admin/creator/attribution/graph`

## Behavior
- Persists typed contribution edges with required evidence references.
- Supports deterministic graph queries by asset subject.
- Enforces policy-limited edge types for rights and payout integrity.
