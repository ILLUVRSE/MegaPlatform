# Party Core Decisions & Tradeoffs

## Leader Timestamp Algorithm
- Host sends heartbeat every 2 seconds containing `leaderTime` (ms) and `playbackPositionMs`.
- Followers compute `estimatedPosition = playbackPositionMs + (Date.now() - leaderTime)`.
- Drift correction applies smoothing for small deltas and snapping for large deltas to avoid jitter.

## Redis Keys & Channels
- State key: `illuvrse:party:{partyId}:state`
- Pub/Sub channel: `illuvrse:party:{partyId}:pub`
- Seat reservation lock: `illuvrse:party:{partyId}:seat:{seatIndex}:reservation`

## Seat Reservation TTL
- Reservations use `SET key value NX PX ttl` (30 seconds).
- Client refreshes the reservation every 10 seconds while holding a seat.
- Expired locks clear automatically via Redis key expiry.

## LiveKit Hooks
- `apps/web/app/party/lib/livekit.ts` provides stubbed `connect`, `disconnect`, and `mute` helpers.
- Replace with LiveKit Room + Track APIs and token provisioning when ready.

## Host Disconnect Fallback
- Current implementation stores hostId on the Party record; if the host disappears, promote the first participant listed in `participants` as the next leader.
- This is documented for future implementation but not yet automated.
