# Studio Rendering Queue Hardening

## Queue policy

- Studio jobs use a deterministic dedupe key: `projectId:type`.
- BullMQ retries use exponential backoff with deterministic jitter so persisted retry metadata matches the actual queue schedule.
- Retry settings are controlled by:
  - `STUDIO_JOB_ATTEMPTS`
  - `STUDIO_RETRY_BASE_DELAY_MS`
  - `STUDIO_RETRY_MAX_DELAY_MS`
  - `STUDIO_RETRY_JITTER`

## Worker persistence

- `AgentJob.inputJson` carries the durable dedupe key.
- `AgentJob.outputJson` persists:
  - `attempts`
  - `maxAttempts`
  - `lastError`
  - `retryable`
  - retry scheduling metadata such as `nextRetryAt`
- Worker-generated assets are idempotent on stable `(projectId, kind, storageKey)` identities, with `metaJson.jobType` and `metaJson.outputKind` retained for observability.
- Retries update the same `StudioAsset` row instead of creating duplicate rows for the same output.

## Observability

- `GET /api/admin/studio/queue-health` returns:
  - aggregate job counts by status and type
  - queue counts from BullMQ when available
  - retry and failure indicators
  - recent errors with attempt metadata
  - latency summaries overall and by job type

## Operational risks

- DB contention can increase if multiple workers race on the same idempotent asset key.
- Retry storms are possible if upstream render/storage dependencies flap broadly.
- Next follow-up: emit queue-health metrics to the central observability pipeline instead of relying only on request-time aggregation.
