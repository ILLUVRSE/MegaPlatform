# Key Rotation Runbook

Use this runbook to rotate platform secrets on schedule and verify compliance.

## Rotation Scope

- Auth/session: `NEXTAUTH_SECRET`
- Storage: `S3_SECRET_KEY`
- Realtime: `LIVEKIT_API_SECRET`

## Procedure

1. Generate replacement secret material in your approved secret manager.
2. Update stage first, validate core paths, then update production.
3. Update `ops/governance/key-rotation.json` with `lastRotatedAt`.
4. Run `pnpm security:key-rotation:check` to confirm no policy breaches.
5. Capture change ticket ID in internal ops notes.

## Verification

- Admin status API: `GET /api/admin/security/key-rotation/status`
- CI/runtime gate: `pnpm security:key-rotation:check`
