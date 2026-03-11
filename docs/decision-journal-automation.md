# Decision Journal Automation

Phase 102 automates logging of significant agent decisions with rationale and evidence references.

## Governance Policy

- `ops/governance/decision-journal.json`

Policy controls required evidence kinds and confidence threshold for accepted decision entries.

## Artifacts

- `docs/ops_brain/decision-journal.json`

Decision records are persisted as structured JSON for deterministic, queryable review.

## Runtime

- `apps/web/lib/decisionJournal.ts`

The runtime supports:
- append with policy validation
- query by role, type, and time window

## API

- `GET /api/admin/governance/decisions`
- `POST /api/admin/governance/decisions`

These endpoints provide operational access for oversight and audit workflows.
