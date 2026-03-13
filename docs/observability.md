# Observability

## OpenTelemetry Tracing

The web runtime now initializes a shared OpenTelemetry-style tracer in `packages/observability/opentelemetry-init.ts` and uses `apps/web/lib/traceMiddleware.ts` to wrap traced HTTP handlers.

Covered request domains:

- Watch
- Party
- Games
- Studio

The middleware injects and forwards W3C `traceparent` and `baggage` headers for both server and serverless paths. Representative handlers currently emit root HTTP spans for:

- `GET /api/watch/featured`
- `POST /api/party/minigames/create`
- `POST /api/games/telemetry`
- `GET|POST /api/studio/realtime`

## Sampling

Sampling rules:

- Default probabilistic sampling: `1%`
- Error-based promotion: `100%`

Unsampled traces are retained only until the request tree completes. If any span records an error, the full trace is exported even when the initial head decision was not sampled.

## Backend Wiring

In non-test runtimes, exported root spans are forwarded into the existing observability backend through `PlatformEvent` inserts with the synthetic event name `trace.http.request` and the `observability_trace` surface.

The minigolf trace dashboard definition lives at `infra/observability/dashboards/minigolf.json`.

## Risk

Primary risk: PII leakage in span attributes.

Current guidance:

- keep span attributes to route, domain, runtime, and status metadata
- do not attach raw cookies, auth headers, full request bodies, or user-generated text
- treat follow-up PII scrubbing as required before broadening trace coverage
