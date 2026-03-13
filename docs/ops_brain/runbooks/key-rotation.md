# Key Rotation Runbook

Use this runbook to rotate platform secrets on schedule and verify compliance.

Primary local verification reference: `docs/security-rotation.md`

## Rotation Scope

- Auth/session: `NEXTAUTH_SECRET`
- Storage: `S3_SECRET_KEY`
- Realtime: `LIVEKIT_API_KEY`
- Realtime: `LIVEKIT_API_SECRET`

## Procedure

1. Generate replacement secret material in the approved secret manager. For LiveKit, rotate the API key and secret as a pair.
2. Record the pending change ticket and planned rollback window before applying any updates.
3. Update stage first:
   - Set the new `NEXTAUTH_SECRET`.
   - Add the rotated `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
   - Keep the previous JWT secret and previous LiveKit key pair available during the overlap window until existing tokens age out.
4. Run `node scripts/security/key-rotation-check.mjs --dry-run` and `pnpm --filter @illuvrse/web shipcheck`.
5. Run `node tooling/security/secrets-scan.mjs --scan` before rollout sign-off to confirm no repository leaks are lingering in history.
6. Validate auth and realtime token issuance:
   - Confirm session creation and protected-route access still work with the new `NEXTAUTH_SECRET`.
   - Confirm `/api/party/[code]/voice/token` issues a valid token with the rotated LiveKit credentials.
7. Promote the same rotated values to production after stage validation succeeds.
8. Remove the previous JWT secret and previous LiveKit key pair only after the overlap window has expired and validation is clean.
9. Update `ops/governance/key-rotation.json` with the new `lastRotatedAt` values and capture the completed ticket in ops notes.

## Verification

- Admin status API: `GET /api/admin/security/key-rotation/status`
- CI/runtime gate: `pnpm security:key-rotation:check`
- Local secret scan: `node tooling/security/secrets-scan.mjs --scan`
- Dry-run simulation: `node scripts/security/key-rotation-check.mjs --dry-run`
- Package gate: `pnpm --filter @illuvrse/web shipcheck`

## Rollback

1. Restore the previous `NEXTAUTH_SECRET`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` from the secret manager.
2. Re-run `node scripts/security/key-rotation-check.mjs --dry-run` and `pnpm --filter @illuvrse/web shipcheck`.
3. Confirm auth sessions and LiveKit token issuance recover before closing the incident.
