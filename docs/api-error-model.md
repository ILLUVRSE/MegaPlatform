# Shared API Error Model (Phase 27)

Canonical error envelope for web APIs.

Source:
- `apps/web/lib/apiError.ts`

## Envelope

```json
{
  "ok": false,
  "error": {
    "code": "invalid_payload",
    "message": "Invalid payload",
    "details": ["field: message"]
  }
}
```

## Codes
- `unauthorized`
- `forbidden`
- `invalid_payload`
- `not_found`
- `rate_limited`
- `conflict`
- `internal_error`

## Adopted Endpoints (baseline)
- `/api/platform/events`
- `/api/games/telemetry`
- `/api/feed`
- `/api/party/[code]/join`
- `/api/watch/my-list`
- `/api/admin/shows`
