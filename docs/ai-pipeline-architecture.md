# AI Studio Pipeline Architecture

## Overview
AI Studio uses a Redis-backed queue to execute asynchronous jobs for Shorts and Memes. The pipeline is split into API orchestration and a background worker that performs rendering and storage.

## Queue Architecture
- Queue: `studio-jobs` (BullMQ)
- Producer: Next.js API routes (`/api/studio/projects/[id]/jobs`, `/api/shorts/[id]/meme`)
- Consumer: `packages/agent-manager/src/worker.ts`
- Retries: 3 attempts with exponential backoff

## Storage Flow
1. Client requests a signed upload URL via `/api/uploads/sign`, uploads directly to S3-compatible storage, and finalizes the asset via `/api/uploads/finalize`.
2. Worker uploads rendered assets to S3-compatible storage.
3. `StudioAsset` records reference every stored output.

## Video Processing
- `SHORT_RENDER` produces a slideshow MP4 from b-roll images and scene captions.
- `VIDEO_TRANSCODE` converts MP4 → HLS and generates thumbnail.
- ShortPosts are updated to reference the HLS manifest when available.

## Meme Processing
- `MEME_CAPTIONS` generates captions (stub text).
- `MEME_RENDER` composites text onto images using sharp + SVG (Impact-style).

## Clip Extractor
- `VIDEO_CLIP_EXTRACT` extracts a 3–7s clip (default 5s).
- `THUMBNAIL_GENERATE` extracts a still frame and enqueues MEME_RENDER.

## Observability
- `/api/studio/jobs/stats` exposes queue counts by status/type.
- Worker logs include job type and duration metadata.

## Future Extensions
- GPU renderers for Shorts + Memes.
- Distributed queue workers with autoscaling.
- CDN + signed URLs, HLS packaging, and lifecycle policies.

## Real Render v1 (Completed)
- Slideshow render from local b-roll pack (`apps/web/public/studio/broll`).
- Caption styles: Clean, Impact, TikTok (ffmpeg drawtext).
- Scene contract: `{ text, durationMs }` with clamped duration (1–3.5s).

## Troubleshooting
- `spawn ffmpeg ENOENT`: install ffmpeg (`sudo apt install -y ffmpeg`).
- `Missing S3 configuration`: ensure S3 env vars are set for worker.
- If captions do not render, check ffmpeg font availability (system fonts).
