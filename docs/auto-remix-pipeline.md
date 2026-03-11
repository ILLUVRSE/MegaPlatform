# Auto-Remix Pipeline

Phase 68 introduces a guarded remix job pipeline with lineage and safety prerequisites.

## Data model

- `RemixJob`
  - source asset, target remix project, requester, status, prompt, metadata
- `RemixJobStatus` lifecycle:
  - `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `BLOCKED`

## API

- `GET /api/studio/remix/jobs`
- `POST /api/studio/remix/jobs`

## Safety + rights gates

Remix enqueue is blocked unless:
- Source asset has an `AssetLineage` record.
- Source asset rights status is not `RESTRICTED`.
- Source project latest QA status is `PASS`.

Successful enqueue creates a new remix `StudioProject` and a queued `RemixJob`.
