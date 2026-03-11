# Worker Runbook

## Purpose
Runs the `@illuvrse/agent-manager` BullMQ worker that processes studio render/transcode jobs.

## Required Environment
- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- optional: `S3_PUBLIC_BASE_URL`

## Local (non-container)
```bash
pnpm --filter @illuvrse/agent-manager dev
```

## Container Build
```bash
docker build -f Dockerfile.worker -t illuvrse-worker:local .
```

## Container Run
```bash
docker run --rm \
  --env-file .env \
  illuvrse-worker:local
```

## Health Signals
- Worker emits structured logs per job lifecycle event.
- Every 60 seconds worker emits a `Queue heartbeat` log entry with queue counts.
- Container `HEALTHCHECK` uses process liveness (`pgrep -f agent-manager`).
- If no heartbeat appears for >2 minutes, treat worker as unhealthy.

## FFmpeg
- FFmpeg is installed directly in `Dockerfile.worker` (`apt-get install ffmpeg`).
- No host-level ffmpeg dependency is required when running the container.

## TODO
- Add an HTTP health probe endpoint for orchestrators.
- Export metrics to your preferred collector (OpenTelemetry/Prometheus).
