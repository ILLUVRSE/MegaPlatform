import { afterEach, describe, expect, it } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { createAuthManager, createJsonFetcher, createRealtimeClient, useRealtimeState } from "@illuvrse/sdk-js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createMockServerFetch() {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);

    if (url.pathname === "/api/profile" && request.method === "GET") {
      return Response.json({
        authorized: request.headers.get("authorization") === "Bearer sdk-token",
        project: "ILLUVRSE"
      });
    }

    if (url.pathname === "/api/echo" && request.method === "POST") {
      return Response.json({
        body: await request.json()
      });
    }

    if (url.pathname === "/api/realtime" && request.method === "GET") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('event: snapshot\ndata: {"count":1}\n\n'));
          setTimeout(() => {
            controller.enqueue(encoder.encode('event: update\ndata: {"delta":2}\n\n'));
            controller.close();
          }, 10);
        }
      });

      return new Response(stream, {
        headers: {
          "cache-control": "no-cache",
          "content-type": "text/event-stream"
        },
        status: 200
      });
    }

    return new Response("Not found", { status: 404, statusText: "Not Found" });
  };
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

afterEach(async () => {
  document.body.innerHTML = "";
});

describe("@illuvrse/sdk-js", () => {
  it("manages auth state and headers", () => {
    const auth = createAuthManager({ initialToken: "seed-token" });
    const seenTokens: Array<string | null> = [];

    const unsubscribe = auth.subscribe((state) => {
      seenTokens.push(state.token);
    });

    auth.setToken("next-token");
    auth.clearToken();
    unsubscribe();

    expect(auth.getAuthHeaders().get("authorization")).toBeNull();
    expect(seenTokens).toEqual(["next-token", null]);
  });

  it("fetches JSON with auth headers and request body serialization", async () => {
    const auth = createAuthManager({ initialToken: "sdk-token" });
    const fetcher = createJsonFetcher({
      auth,
      baseUrl: "https://sdk.test",
      fetch: createMockServerFetch()
    });

    await expect(fetcher.get<{ authorized: boolean; project: string }>("/api/profile")).resolves.toEqual({
      authorized: true,
      project: "ILLUVRSE"
    });

    await expect(fetcher.post<{ body: { ok: boolean } }>("/api/echo", { body: { ok: true } })).resolves.toEqual({
      body: { ok: true }
    });
  });

  it("streams realtime events from a mock server", async () => {
    const client = createRealtimeClient({
      fetch: createMockServerFetch(),
      url: "https://sdk.test/api/realtime"
    });

    const events: Array<{ type: string; data: unknown }> = [];
    const unsubscribe = await client.subscribe({
      onEvent(event) {
        events.push({ data: event.data, type: event.type });
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    unsubscribe();

    expect(events).toEqual([
      { data: { count: 1 }, type: "snapshot" },
      { data: { delta: 2 }, type: "update" }
    ]);
  });

  it("exposes realtime React hooks over the core client", async () => {
    const client = createRealtimeClient({
      fetch: createMockServerFetch(),
      url: "https://sdk.test/api/realtime"
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      const result = useRealtimeState<number, { count?: number; delta?: number }>({
        client,
        initialState: 0,
        reducer(current, event) {
          if (event.type === "snapshot") {
            return (event.data as { count?: number }).count ?? current;
          }

          if (event.type === "update") {
            return current + ((event.data as { delta?: number }).delta ?? 0);
          }

          return current;
        }
      });

      return React.createElement("output", {
        "data-connected": String(result.connected),
        "data-error": result.error ? result.error.message : "",
        "data-state": String(result.state)
      });
    }

    await act(async () => {
      root.render(React.createElement(Harness));
    });

    await flush();

    const output = container.querySelector("output");
    expect(output?.getAttribute("data-connected")).toBe("true");
    expect(output?.getAttribute("data-state")).toBe("3");

    await act(async () => {
      root.unmount();
    });
  });
});
