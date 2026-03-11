import type { GamesEventPayload } from "@/lib/platformEvents";

export async function trackGameEvent(payload: Omit<GamesEventPayload, "timestamp">) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString()
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon("/api/games/telemetry", new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
  } catch {
    // best effort analytics only
  }

  try {
    await fetch("/api/games/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });
  } catch {
    // best effort analytics only
  }
}
