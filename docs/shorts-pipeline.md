# Shorts Pipeline

The shorts upload path now runs through the studio-backed API and worker stack.

## Upload

- `POST /api/shorts/upload` accepts a raw video body for an existing short project.
- The route reads the stream incrementally, computes SHA-256 while reading, enforces a max payload size, and rejects checksum mismatches.
- A `VIDEO_UPLOAD` asset is created in `pending`, then promoted to `ready` once the source object is stored and the lightweight thumbnail is extracted.
- The route also creates an immediate `THUMBNAIL` asset and enqueues `VIDEO_TRANSCODE`.

## Transcode

- `VIDEO_TRANSCODE` prioritizes mobile fast-pass outputs before the main HLS manifest.
- Fast-pass variants currently generate `mobile-360.mp4` and `mobile-540.mp4`.
- The worker then uploads HLS segments, writes the manifest, generates the canonical thumbnail, and promotes pending assets to `ready`.

## Publish

- Publish still runs through `POST /api/studio/projects/[id]/publish`.
- Asset state is finalized transactionally to `published`.
- Publish triggers CDN invalidation with an idempotent request id and retry/backoff.

## Ops

- Dry-run invalidation: `node infra/cdn/invalidate.mjs --dry-run <asset-key>`
- Relevant env vars:
  - `SHORTS_UPLOAD_MAX_BYTES`
  - `CDN_INVALIDATION_URL`
  - `CDN_INVALIDATION_TOKEN`
  - `CDN_INVALIDATION_ATTEMPTS`
  - `CDN_INVALIDATION_BASE_DELAY_MS`
