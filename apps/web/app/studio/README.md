# AI Studio Pipeline

## Overview
AI Studio provides a creator shell for Shorts + MemeMachine. Jobs are processed asynchronously via Redis + BullMQ with a background worker. Rendered assets are stored in S3-compatible storage.

## Environment Variables
- `DATABASE_URL` — Postgres connection string.
- `REDIS_URL` — Redis connection string.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — S3-compatible storage (MinIO for local).
- `S3_PUBLIC_BASE_URL` — optional; if set, public URLs use this base instead of the raw endpoint.
- `S3_SIGNED_UPLOAD_TTL_SEC` — signed upload URL TTL in seconds (clamped to 60..900).
- `S3_REGION` — optional region override (default `us-east-1`).
- `S3_FORCE_PATH_STYLE` — `true|false`, default `true`.
- `NEXTAUTH_SECRET` — optional if using NextAuth (createdById will be filled when available).
- `STUDIO_JOB_ATTEMPTS` — optional queue attempt limit (default `5`).
- `STUDIO_RETRY_BASE_DELAY_MS` — optional exponential retry base delay in ms (default `2000`).
- `STUDIO_KEEP_COMPLETED_JOBS` — optional queue retention count for completed jobs (default `500`).
- `STUDIO_KEEP_FAILED_JOBS` — optional queue retention count for failed jobs (default `2000`).
- `STUDIO_WORKER_CONCURRENCY` — optional worker concurrency (default `2`).
- `STUDIO_WORKER_LOCK_MS` — optional BullMQ job lock duration in ms (default `120000`).
- `STUDIO_WORKER_MAX_STALLED` — optional stalled-job tolerance before fail (default `2`).
- `STUDIO_RENDER_QUALITY` — optional default render profile: `draft|standard|high` (default `high`).

## Commands
```bash
pnpm --filter @illuvrse/db prisma:generate
pnpm --filter @illuvrse/db prisma:migrate
pnpm --filter @illuvrse/db prisma:seed
pnpm dev
pnpm --filter @illuvrse/agent-manager dev
pnpm test
pnpm test:e2e
```

## Local MinIO
```bash
docker run --name illuvrse-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -d minio/minio server /data --console-address ":9001"
```

## Pipeline Notes
- Jobs are queued in Redis (`studio-jobs`) and processed by `@illuvrse/agent-manager`.
- Job creation/retry rejects duplicate in-flight jobs for the same project + type.
- Render outputs include MP4, HLS manifest, thumbnails, and meme PNGs.
- Retry metadata is persisted on each job (`attempts`, `maxAttempts`, retryability).
- Uploads use S3-compatible storage; local dev should use MinIO.

## Upload Flow (Signed URLs)
1. Client requests `/api/uploads/sign` with file metadata and upload kind.
2. Client uploads directly to S3/MinIO using the presigned PUT URL.
3. Client calls `/api/uploads/finalize`, which validates, optionally HEADs the object, and creates a `StudioAsset`.

Allowed types & sizes:
- IMAGE_UPLOAD: `image/png`, `image/jpeg`, `image/webp` (<= 10MB)
- VIDEO_UPLOAD: `video/mp4` (<= 250MB)
- AUDIO_UPLOAD: `audio/mpeg`, `audio/wav` (<= 50MB)

## Cleanup (MVP)
- Uploads are created with `metaJson.temporary=true` and `metaJson.uploadedAt`.
- When a project is published, assets are marked `temporary=false`.
- Admin cleanup endpoint supports storage-aware deletion:
  - `POST /api/admin/assets/cleanup`
  - Payload: `{ days, dryRun, deleteFromStorage, continueOnStorageError, maxBatch }`

## Premium Shorts (Stub)
- Shorts can be marked `isPremium` with a `price` (in cents).
- Access uses `ShortPurchase` records tied to a user ID or anon cookie (`ILLUVRSE_ANON_ID`).
- TODO: replace purchase stub with real checkout + entitlements (Stripe).

## Next Integrations
- GPU-based renderers and real AI generation.
- CDN + signed URLs + lifecycle for assets.
