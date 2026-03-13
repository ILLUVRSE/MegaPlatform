# Security Rotation Verification

Use this guide for local rotation validation and repository secret scanning.

## Local Gates

- Install hooks with `bash ops/scripts/install-hooks.sh`.
- The local pre-commit hook runs `node tooling/security/secrets-scan.mjs --staged`.
- Run a full scan with `node tooling/security/secrets-scan.mjs --scan`.
- Run rotation verification with `node scripts/security/key-rotation-check.mjs --dry-run`.

## Rotation Checks

- `NEXTAUTH_SECRET` must be strong replacement material before rollout.
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` must rotate as a pair.
- The verification script signs dry-run JWT and LiveKit tokens with rotated material and validates overlap acceptance before retirement.

## False Positives

- Placeholder examples should use obvious non-secret values such as `replace-with-...`.
- Test fixtures that intentionally include secret-like values must add `secret-scan: allow` on the same line.
- Review any generic assignment findings before suppressing them; the generic detector is intentionally conservative.

## Follow-up

- Update the SRE runbook after each production rotation with the ticket, overlap window, and retirement date for the previous material.
