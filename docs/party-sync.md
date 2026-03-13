# Party Sync

## Overview
Watch Party playback uses a host-authoritative timeline carried through Redis-backed world-state and SSE playback updates. The server now stamps playback updates with authoritative timestamps so reconnecting hosts and followers converge on the same playhead instead of trusting stale local clocks.

## Playback Contract
- `POST /api/party/[code]/playback`
  - Body: `{ action, leaderTime, playbackPositionMs, currentIndex, playbackState }`
  - Actions: `heartbeat`, `play`, `pause`, `resume`, `advance`, `seek`
  - Response: authoritative playback snapshot including `timelineRevision`, `syncSequence`, `softLockUntil`, `lastAction`, and `lastHeartbeatAt`
- `GET /api/party/[code]/events`
  - Emits `playback_update` events with the same authoritative metadata

## Sync Behavior
1. The host sends heartbeat updates while playback is active.
2. The server rewrites `leaderTime` with its own clock and stores the current timeline in world-state.
3. Followers estimate the target playhead from the authoritative timestamp.
4. Small drift is repaired with smoothing; large drift snaps to the host timeline.
5. Host seeks and playlist advances increment `timelineRevision` and set `softLockUntil` to suppress seek storms while followers settle.

## Resume Handshake
When the host SSE stream reconnects, the client sends a `resume` playback action. The server replies with the authoritative playhead derived from the stored timeline, then hands leadership back with a fresh timestamp. This prevents a stale browser tab from rewinding the room after disconnect or laptop sleep.

## Risks
- Resume accuracy depends on end-to-end latency during the reconnect handshake.
- The current UI exposes basic scrub controls but does not yet surface reconnect state or drift corrections to viewers.
