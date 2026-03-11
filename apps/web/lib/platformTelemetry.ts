import type { PlatformAppEventPayload } from "@/lib/platformEvents";

export async function trackPlatformEvent(payload: Omit<PlatformAppEventPayload, "timestamp">) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString()
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon("/api/platform/events", new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
  } catch {
    // fall back to fetch
  }

  try {
    await fetch("/api/platform/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });
  } catch {
    // best effort analytics only
  }
}
