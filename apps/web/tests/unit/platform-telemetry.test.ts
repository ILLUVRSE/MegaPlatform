import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackPlatformEvent } from "@/lib/platformTelemetry";

describe("platform telemetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses sendBeacon when available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const sendBeaconMock = vi.fn(() => true);
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: sendBeaconMock
    });

    await trackPlatformEvent({
      event: "nav_click",
      module: "Apps",
      href: "/apps",
      surface: "header_desktop"
    });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to fetch when sendBeacon fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false)
    });

    await trackPlatformEvent({
      event: "module_open",
      module: "News",
      href: "/news",
      surface: "apps_directory"
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/platform/events",
      expect.objectContaining({
        method: "POST",
        keepalive: true
      })
    );
  });
});
