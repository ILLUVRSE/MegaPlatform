# AI Studio Decisions

## Data Model
- `StudioProject` is the root object for all creator work.
- `AgentJob` tracks async-like steps (script, scenes, render, captions).
- `StudioAsset` stores render outputs and uploads.
- `ShortPost` is the Shorts feed entry, optionally linked to a project.

## Queue + Worker
- Jobs enqueue to Redis (`studio-jobs`) via BullMQ.
- `packages/agent-manager` processes jobs and updates job/project status.
- Failures mark job + project as FAILED and are retried up to 3 times.

## Asset Strategy
- Assets are stored in S3-compatible storage (MinIO locally).
- HLS manifests + thumbnails are generated for video content.
- Meme rendering uses an Impact-style overlay via sharp + SVG.

## Publish Pipeline
- Publish prefers HLS manifest for Shorts (falls back to MP4).
- Creates a ShortPost and marks the project as PUBLISHED.

## Meme This + Clip Extract
- Shorts can enqueue a clip extract + thumbnail + meme render.
- Party playback can also trigger meme generation from active media.
