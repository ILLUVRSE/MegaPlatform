import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthManager } from "./auth";

export interface RealtimeEvent<T = unknown> {
  data: T;
  id?: string;
  type: string;
}

export interface RealtimeSubscribeOptions<T = unknown> {
  onError?: (error: Error) => void;
  onEvent: (event: RealtimeEvent<T>) => void;
  signal?: AbortSignal;
}

export interface RealtimeClient {
  subscribe<T = unknown>(options: RealtimeSubscribeOptions<T>): Promise<() => void>;
}

export interface RealtimeClientOptions {
  auth?: AuthManager;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
  parse?: (raw: string, eventType: string) => unknown;
  url: string;
}

export interface RealtimeSubscriptionState<T> {
  connected: boolean;
  error: Error | null;
  latestEvent: RealtimeEvent<T> | null;
}

function defaultParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseEventBlock(block: string, parse: (raw: string, eventType: string) => unknown): RealtimeEvent {
  let type = "message";
  let id: string | undefined;
  const data: string[] = [];

  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator >= 0 ? line.slice(0, separator) : line;
    const value = separator >= 0 ? line.slice(separator + 1).trimStart() : "";

    if (field === "event") type = value;
    if (field === "id") id = value;
    if (field === "data") data.push(value);
  }

  return {
    data: parse(data.join("\n"), type),
    id,
    type
  };
}

async function readEventStream<T>(
  response: Response,
  options: RealtimeSubscribeOptions<T>,
  parse: (raw: string, eventType: string) => unknown
) {
  if (!response.ok || !response.body) {
    throw new Error(`ILLUVRSE realtime stream failed with ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      options.onEvent(parseEventBlock(part, parse) as RealtimeEvent<T>);
    }
  }
}

export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("createRealtimeClient requires a fetch implementation");
  }

  return {
    async subscribe<T = unknown>(subscribeOptions: RealtimeSubscribeOptions<T>) {
      const controller = new AbortController();
      const externalSignal = subscribeOptions.signal;

      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort(externalSignal.reason);
        } else {
          externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
        }
      }

      const headers = options.auth?.getAuthHeaders(options.headers) ?? new Headers(options.headers);
      headers.set("accept", "text/event-stream");
      headers.set("cache-control", "no-cache");

      const promise = fetchImpl(options.url, {
        headers,
        method: "GET",
        signal: controller.signal
      }).then((response) => readEventStream<T>(response, subscribeOptions, options.parse ?? defaultParse));

      promise.catch((error) => {
        if (controller.signal.aborted) return;
        subscribeOptions.onError?.(error instanceof Error ? error : new Error(String(error)));
      });

      return () => controller.abort();
    }
  };
}

export interface UseRealtimeSubscriptionOptions<T> {
  client: RealtimeClient;
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent<T>) => void;
}

export function useRealtimeSubscription<T>(
  options: UseRealtimeSubscriptionOptions<T>
): RealtimeSubscriptionState<T> {
  const [state, setState] = useState<RealtimeSubscriptionState<T>>({
    connected: false,
    error: null,
    latestEvent: null
  });
  const onEventRef = useRef(options.onEvent);

  useEffect(() => {
    onEventRef.current = options.onEvent;
  }, [options.onEvent]);

  useEffect(() => {
    if (options.enabled === false) {
      setState({
        connected: false,
        error: null,
        latestEvent: null
      });
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, connected: true, error: null }));

    void options.client
      .subscribe<T>({
        onError(error) {
          setState((current) => ({ ...current, connected: false, error }));
        },
        onEvent(event) {
          onEventRef.current?.(event);
          setState({
            connected: true,
            error: null,
            latestEvent: event
          });
        },
        signal: controller.signal
      })
      .catch((error) => {
        setState({
          connected: false,
          error: error instanceof Error ? error : new Error(String(error)),
          latestEvent: null
        });
      });

    return () => controller.abort();
  }, [options.client, options.enabled]);

  return state;
}

export interface UseRealtimeStateOptions<TState, TEvent = unknown> {
  client: RealtimeClient;
  enabled?: boolean;
  initialState: TState;
  reducer: (state: TState, event: RealtimeEvent<TEvent>) => TState;
}

export function useRealtimeState<TState, TEvent = unknown>(
  options: UseRealtimeStateOptions<TState, TEvent>
) {
  const [state, setState] = useState(options.initialState);
  const subscription = useRealtimeSubscription<TEvent>({
    client: options.client,
    enabled: options.enabled,
    onEvent(event) {
      setState((current) => options.reducer(current, event));
    }
  });

  const snapshot = useMemo(
    () => ({
      connected: subscription.connected,
      error: subscription.error,
      latestEvent: subscription.latestEvent,
      state
    }),
    [state, subscription.connected, subscription.error, subscription.latestEvent]
  );

  return snapshot;
}
