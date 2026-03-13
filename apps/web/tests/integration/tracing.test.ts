import { describe, expect, it } from "vitest";
import { initOpenTelemetry } from "@illuvrse/observability";

describe("distributed tracing integration", () => {
  it("creates traces for a simulated watch-party-games-studio request chain", async () => {
    const exports: Array<{
      traceId: string;
      spans: Array<{
        name: string;
        traceId: string;
        attributes: Record<string, string | number | boolean>;
      }>;
    }> = [];

    const tracer = initOpenTelemetry({
      serviceName: "@illuvrse/web",
      backend: "memory",
      sampling: {
        defaultProbability: 0.01,
        alwaysSampleOnError: true
      },
      exportTrace(trace) {
        exports.push(trace);
      }
    });

    let parentContext = tracer.extractContext({
      traceparent: "00-11111111111111111111111111111111-2222222222222222-01"
    });

    const hops = [
      {
        name: "http.request.watch.featured",
        attributes: {
          "http.method": "GET",
          "http.route": "/api/watch/featured",
          "http.status_code": 200,
          "illuvrse.domain": "watch",
          "illuvrse.runtime": "serverless"
        }
      },
      {
        name: "http.request.party.minigolf.create",
        attributes: {
          "http.method": "POST",
          "http.route": "/api/party/minigames/create",
          "http.status_code": 200,
          "illuvrse.domain": "party",
          "illuvrse.runtime": "serverless"
        }
      },
      {
        name: "http.request.games.telemetry",
        attributes: {
          "http.method": "POST",
          "http.route": "/api/games/telemetry",
          "http.status_code": 200,
          "illuvrse.domain": "games",
          "illuvrse.runtime": "serverless"
        }
      },
      {
        name: "http.request.studio.realtime.event",
        attributes: {
          "http.method": "POST",
          "http.route": "/api/studio/realtime",
          "http.status_code": 200,
          "illuvrse.domain": "studio",
          "illuvrse.runtime": "serverless"
        }
      }
    ] as const;

    for (const hop of hops) {
      await tracer.withSpan(
        hop.name,
        {
          kind: "server",
          parentContext,
          attributes: hop.attributes
        },
        async (span) => {
          parentContext = tracer.extractContext({
            traceparent: span.toTraceParent()
          });
        }
      );
    }

    const groupedByTrace = new Map<string, Array<(typeof exports)[number]["spans"][number]>>();
    for (const trace of exports) {
      groupedByTrace.set(trace.traceId, [...(groupedByTrace.get(trace.traceId) ?? []), ...trace.spans]);
    }

    expect(groupedByTrace.size).toBe(1);
    const spans = Array.from(groupedByTrace.values())[0] ?? [];
    expect(spans).toHaveLength(4);
    expect(spans.map((span) => span.name)).toEqual(hops.map((hop) => hop.name));
    expect(new Set(spans.map((span) => span.traceId))).toEqual(new Set(["11111111111111111111111111111111"]));
    expect(spans.map((span) => span.attributes["illuvrse.domain"])).toEqual(["watch", "party", "games", "studio"]);
    expect(spans.every((span) => span.attributes["http.status_code"] === 200)).toBe(true);
  });
});
