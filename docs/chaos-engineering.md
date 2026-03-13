# Chaos Engineering

The chaos harness is a controlled test-only runner for reliability drills. It injects synthetic latency, packet loss, worker termination, and temporary service-response patches inside bounded windows, then records SLO impact and rollback signals.

## Entry points

- Runner: `tools/chaos/chaos-runner.mjs`
- Metrics hooks: `packages/observability/chaos-metrics.ts`
- Sample test: `apps/web/tests/chaos/party-chaos.test.ts`

## Supported faults

- `latency`: adds synthetic delay to a target dependency
- `drop_packets`: simulates transport loss for streaming or realtime channels
- `kill_worker`: terminates a named worker during a bounded window
- `patch_response`: replaces an endpoint response body or status during the experiment

## Party Rooms sample

`party-network-partition` simulates a partition between Party Rooms presence and event delivery:

- injects `900ms` latency into the live presence stream
- drops `45%` of SSE packets
- kills the `party-presence-2` worker mid-test
- patches `/api/party/:code/events` to return a degraded partition response

Run it with:

```bash
node tools/chaos/chaos-runner.mjs --scenario=party-network-partition --duration=30s
```

The runner writes a JSON artifact under `artifacts/chaos/` with:

- fault windows and targets
- SLO samples gathered through the drill
- computed impact for latency, availability, and error rate
- auto-rollback reasons when thresholds are breached

## Safety

Do not run this harness against production. The current scenarios intentionally degrade service behavior and are only suitable for local, sandbox, or pre-production reliability drills.

## Follow-up

Add scenario-specific runbooks that map each rollback reason to operators, comms steps, and recovery verification checks.
