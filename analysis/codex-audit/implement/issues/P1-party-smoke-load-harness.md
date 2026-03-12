# P1: Party smoke and WebRTC load harness

## Why this exists

The implementation pass hardened the existing Phase 6 runtime and added test coverage for voice-token telemetry, but it did not add the prompt's requested standalone smoke script and browser-based load harness under `analysis/codex-audit/implement/tests/` and `analysis/codex-audit/implement/load/`.

## Remaining scope

- Add `analysis/codex-audit/implement/tests/party-smoke-test.js`
- Add `analysis/codex-audit/implement/tests/party-playwright.spec.ts`
- Add `analysis/codex-audit/implement/load/rtc-load-harness.js`
- Exercise SSE keepalive, presence ping, and voice token issuance through browser automation

## Acceptance criteria

- Smoke script joins a party and verifies presence heartbeat plus SSE heartbeat behavior
- Playwright spec validates a host plus multiple participants
- Load harness records join latency and heartbeat failure rate

## Patch reference

- `analysis/codex-audit/implement/patches/codex-implement.patch`
