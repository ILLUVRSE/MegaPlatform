# Executive Briefing Generator

Phase 106 automates strategic daily briefings for human oversight.

## Governance Policy

- `ops/governance/executive-briefing.json`

Controls section requirements and maximum list sizes.

## Runtime

- `apps/web/lib/executiveBriefing.ts`

Generates briefing content from governance drift and loop reliability signals.

## Artifacts

- `docs/ops_brain/briefings/latest.json`

Latest briefing is persisted for dashboard/query consumption.

## API

- `GET /api/admin/governance/briefings/executive`
- `POST /api/admin/governance/briefings/executive`
