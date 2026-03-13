import crypto from "crypto";

export const TRACE_PARENT_HEADER = "traceparent";
export const TRACE_BAGGAGE_HEADER = "baggage";

type TraceAttributeValue = string | number | boolean;

export type TraceAttributes = Record<string, TraceAttributeValue>;

export type TraceSamplingConfig = {
  defaultProbability: number;
  alwaysSampleOnError: boolean;
};

export type TraceExporterBackend = "memory" | "platform-events";

export type TraceContext = {
  traceId: string;
  spanId: string;
  traceFlags: string;
  parentSpanId?: string;
};

export type TraceSpanRecord = {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: "server" | "internal";
  startTime: string;
  endTime: string | null;
  attributes: TraceAttributes;
  status: "ok" | "error";
  errorMessage: string | null;
  sampled: boolean;
};

export type ExportedTrace = {
  traceId: string;
  sampled: boolean;
  exportedBecause: "probabilistic" | "error";
  backend: TraceExporterBackend;
  spans: TraceSpanRecord[];
};

export type OpenTelemetryInitConfig = {
  serviceName: string;
  sampling?: Partial<TraceSamplingConfig>;
  backend?: TraceExporterBackend;
  exportTrace?: (trace: ExportedTrace) => Promise<void> | void;
};

type TraceState = {
  traceId: string;
  sampled: boolean;
  forceSample: boolean;
  spans: TraceSpanRecord[];
  openSpanIds: Set<string>;
};

export type TraceSpan = {
  context: TraceContext;
  setAttribute: (key: string, value: TraceAttributeValue | null | undefined) => void;
  recordError: (error: unknown) => void;
  end: (input?: { status?: "ok" | "error"; error?: unknown }) => Promise<void>;
  toTraceParent: () => string;
};

type SpanOptions = {
  parentContext?: TraceContext | null;
  kind?: "server" | "internal";
  attributes?: TraceAttributes;
};

const DEFAULT_SAMPLING: TraceSamplingConfig = {
  defaultProbability: 0.01,
  alwaysSampleOnError: true
};

const traceStates = new Map<string, TraceState>();
const exportedTraces: ExportedTrace[] = [];

function randomHex(bytes: number) {
  return crypto.randomBytes(bytes).toString("hex");
}

function clampProbability(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SAMPLING.defaultProbability;
  return Math.max(0, Math.min(1, value));
}

function parseTraceparent(value: string | null | undefined): TraceContext | null {
  if (!value) return null;
  const match = value.trim().match(/^([\da-f]{2})-([\da-f]{32})-([\da-f]{16})-([\da-f]{2})$/i);
  if (!match) return null;
  const [, , traceId, spanId, traceFlags] = match;
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) return null;
  return {
    traceId: traceId.toLowerCase(),
    spanId: spanId.toLowerCase(),
    traceFlags: traceFlags.toLowerCase()
  };
}

function formatTraceparent(context: TraceContext) {
  return `00-${context.traceId}-${context.spanId}-${context.traceFlags}`;
}

function hashTraceId(traceId: string) {
  return Number.parseInt(traceId.slice(-8), 16) / 0xffffffff;
}

function cloneSpan(span: TraceSpanRecord): TraceSpanRecord {
  return {
    ...span,
    attributes: { ...span.attributes }
  };
}

export function resetExportedTraces() {
  traceStates.clear();
  exportedTraces.splice(0, exportedTraces.length);
}

export function getExportedTraces() {
  return exportedTraces.map((trace) => ({
    ...trace,
    spans: trace.spans.map(cloneSpan)
  }));
}

export function extractTraceContext(headers: Headers | Record<string, string | undefined> | undefined | null) {
  if (!headers) return null;
  if (headers instanceof Headers) {
    return parseTraceparent(headers.get(TRACE_PARENT_HEADER));
  }
  return parseTraceparent(headers[TRACE_PARENT_HEADER]);
}

export function appendBaggage(existing: string | null | undefined, values: Record<string, string>) {
  const entries = new Map<string, string>();
  for (const item of (existing ?? "").split(",")) {
    const [rawKey, rawValue] = item.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (key && value) entries.set(key, value);
  }
  for (const [key, value] of Object.entries(values)) {
    entries.set(key, encodeURIComponent(value));
  }
  return Array.from(entries.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}

export function initOpenTelemetry(config: OpenTelemetryInitConfig) {
  const sampling: TraceSamplingConfig = {
    defaultProbability: clampProbability(config.sampling?.defaultProbability ?? DEFAULT_SAMPLING.defaultProbability),
    alwaysSampleOnError: config.sampling?.alwaysSampleOnError ?? DEFAULT_SAMPLING.alwaysSampleOnError
  };
  const backend = config.backend ?? "memory";

  async function flushTrace(traceId: string) {
    const state = traceStates.get(traceId);
    if (!state || state.openSpanIds.size > 0) return;
    traceStates.delete(traceId);
    if (!state.sampled && !state.forceSample) return;
    const exported: ExportedTrace = {
      traceId,
      sampled: state.sampled || state.forceSample,
      exportedBecause: state.forceSample && !state.sampled ? "error" : "probabilistic",
      backend,
      spans: state.spans.map(cloneSpan)
    };
    exportedTraces.push(exported);
    await config.exportTrace?.(exported);
  }

  function startSpan(name: string, options: SpanOptions = {}): TraceSpan {
    const parentContext = options.parentContext ?? null;
    const traceId = parentContext?.traceId ?? randomHex(16);
    const sampled = parentContext ? (parentContext.traceFlags === "01") : hashTraceId(traceId) < sampling.defaultProbability;
    const spanId = randomHex(8);
    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      traceFlags: sampled ? "01" : "00"
    };
    const state = traceStates.get(traceId) ?? {
      traceId,
      sampled,
      forceSample: false,
      spans: [],
      openSpanIds: new Set<string>()
    };
    if (!traceStates.has(traceId)) {
      traceStates.set(traceId, state);
    }

    const record: TraceSpanRecord = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId ?? null,
      name,
      kind: options.kind ?? "internal",
      startTime: new Date().toISOString(),
      endTime: null,
      attributes: {
        "service.name": config.serviceName,
        "sampling.default_probability": sampling.defaultProbability,
        ...(options.attributes ?? {})
      },
      status: "ok",
      errorMessage: null,
      sampled
    };
    state.spans.push(record);
    state.openSpanIds.add(spanId);

    return {
      context,
      setAttribute(key, value) {
        if (value === null || value === undefined) return;
        record.attributes[key] = value;
      },
      recordError(error) {
        record.status = "error";
        record.errorMessage = error instanceof Error ? error.message : String(error);
        if (sampling.alwaysSampleOnError) {
          state.forceSample = true;
          record.attributes["sampling.promoted_by_error"] = true;
        }
      },
      async end(input) {
        if (record.endTime) return;
        if (input?.error) {
          this.recordError(input.error);
        }
        if (input?.status) {
          record.status = input.status;
        }
        if (record.status === "error" && sampling.alwaysSampleOnError) {
          state.forceSample = true;
        }
        record.endTime = new Date().toISOString();
        state.openSpanIds.delete(spanId);
        await flushTrace(traceId);
      },
      toTraceParent() {
        return formatTraceparent(context);
      }
    };
  }

  async function withSpan<T>(name: string, options: SpanOptions, work: (span: TraceSpan) => Promise<T> | T) {
    const span = startSpan(name, options);
    try {
      const result = await work(span);
      await span.end();
      return result;
    } catch (error) {
      await span.end({ status: "error", error });
      throw error;
    }
  }

  return {
    backend,
    sampling,
    extractContext(headers: Headers | Record<string, string | undefined> | undefined | null) {
      return extractTraceContext(headers);
    },
    startSpan,
    withSpan
  };
}
