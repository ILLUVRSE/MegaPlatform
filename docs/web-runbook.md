# Web Deploy Runbook

## Build image
```bash
docker build -f Dockerfile.web -t illuvrse-web:local .
```

## Run container
```bash
docker run --rm -p 3000:3000 --env-file .env illuvrse-web:local
```

## Required environment
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `REDIS_URL` (party/studio realtime features)
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- optional: `S3_PUBLIC_BASE_URL`

## Health
- `Dockerfile.web` exposes healthcheck against `GET /api/watch/featured`.
