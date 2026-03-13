import {
  TRACE_BAGGAGE_HEADER,
  TRACE_PARENT_HEADER,
  appendBaggage,
  getExportedTraces,
  initOpenTelemetry,
  resetExportedTraces,
  type TraceAttributes,
  type TraceContext
} from "@illuvrse/observability";
import { insertPlatformEvent } from "@/lib/platformEvents";

type TraceDomain = "watch" | "party" | "games" | "studio" | "platform";

type TracedRouteOptions = {
  name?: string;
  attributes?: TraceAttributes;
};

const TRACE_SURFACE = "observability_trace";
const DEFAULT_TRACE_NAME = "http.request";
const serverlessPrefixes = ["/api/watch", "/api/party", "/api/games", "/api/studio"] as const;
const serverPrefixes = ["/watch", "/party", "/games", "/studio"] as const;

function isTestRuntime() {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST) || Boolean(process.env.VITEST_WORKER_ID);
}

function resolveTraceDomain(pathname: string): TraceDomain {
  if (pathname.startsWith("/api/watch") || pathname.startsWith("/watch")) return "watch";
  if (pathname.startsWith("/api/party") || pathname.startsWith("/party")) return "party";
  if (pathname.startsWith("/api/games") || pathname.startsWith("/games")) return "games";
  if (pathname.startsWith("/api/studio") || pathname.startsWith("/studio")) return "studio";
  return "platform";
}

function resolveRuntime(pathname: string) {
  if (serverlessPrefixes.some((prefix) => pathname.startsWith(prefix))) return "serverless";
  if (serverPrefixes.some((prefix) => pathname.startsWith(prefix))) return "server";
  return "platform";
}

function routeLabel(pathname: string) {
  return pathname === "/" ? "root" : pathname.replace(/^\/+/, "").replace(/[/?&#]+/g, ".") || "root";
}

const tracer = initOpenTelemetry({
  serviceName: "@illuvrse/web",
  backend: isTestRuntime() ? "memory" : "platform-events",
  sampling: {
    defaultProbability: 0.01,
    alwaysSampleOnError: true
  },
  async exportTrace(trace) {
    if (isTestRuntime()) return;
    const rootSpan = trace.spans.find((span) => span.parentSpanId === null) ?? trace.spans[0];
    if (!rootSpan) return;
    await insertPlatformEvent({
      event: "trace.http.request",
      module: `${String(rootSpan.attributes["illuvrse.domain"] ?? "platform")}:${rootSpan.name}`,
      href: String(rootSpan.attributes["http.route"] ?? "/"),
      surface: TRACE_SURFACE
    });
  }
});

export function resetTracingForTests() {
  resetExportedTraces();
}

export function getTracingExportsForTests() {
  return getExportedTraces();
}

export function buildTraceHeaders(url: string, headers?: HeadersInit) {
  const requestHeaders = new Headers(headers);
  const pathname = new URL(url).pathname;
  const domain = resolveTraceDomain(pathname);
  const parent = tracer.extractContext(requestHeaders);
  const span = tracer.startSpan(`middleware.${domain}.${routeLabel(pathname)}`, {
    kind: "server",
    parentContext: parent,
    attributes: {
      "http.method": "MIDDLEWARE",
      "http.route": pathname,
      "illuvrse.domain": domain,
      "illuvrse.runtime": resolveRuntime(pathname),
      "sampling.error_rule": "always_on"
    }
  });
  requestHeaders.set(TRACE_PARENT_HEADER, span.toTraceParent());
  requestHeaders.set(
    TRACE_BAGGAGE_HEADER,
    appendBaggage(requestHeaders.get(TRACE_BAGGAGE_HEADER), {
      "illuvrse.domain": domain,
      "illuvrse.runtime": resolveRuntime(pathname)
    })
  );
  span.end().catch(() => undefined);
  return requestHeaders;
}

export async function withTracedRoute(request: Request, options: TracedRouteOptions, work: () => Promise<Response>) {
  const pathname = new URL(request.url).pathname;
  const domain = resolveTraceDomain(pathname);
  const runtime = resolveRuntime(pathname);
  const spanName = options.name ?? `${DEFAULT_TRACE_NAME}.${domain}.${routeLabel(pathname)}`;
  const parentContext: TraceContext | null = tracer.extractContext(request.headers);

  return tracer.withSpan(
    spanName,
    {
      kind: "server",
      parentContext,
      attributes: {
        "http.method": request.method,
        "http.route": pathname,
        "illuvrse.domain": domain,
        "illuvrse.runtime": runtime,
        "sampling.default_rate": 0.01,
        "sampling.error_rule": "always_on",
        ...(options.attributes ?? {})
      }
    },
    async (span) => {
      try {
        const response = await work();
        span.setAttribute("http.status_code", response.status);
        if (response.status >= 500) {
          span.recordError(new Error(`http_${response.status}`));
        }
        response.headers.set(TRACE_PARENT_HEADER, span.toTraceParent());
        response.headers.set(
          TRACE_BAGGAGE_HEADER,
          appendBaggage(request.headers.get(TRACE_BAGGAGE_HEADER), {
            "illuvrse.domain": domain,
            "illuvrse.runtime": runtime
          })
        );
        response.headers.set("x-illuvrse-trace-id", span.context.traceId);
        response.headers.set("x-illuvrse-trace-domain", domain);
        return response;
      } catch (error) {
        span.setAttribute("http.status_code", 500);
        span.recordError(error);
        throw error;
      }
    }
  );
}
