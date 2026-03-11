import { describe, expect, it } from "vitest";
import { bridgeExternalTelemetry } from "@/lib/openTelemetryBridge";

describe("open telemetry bridge", () => {
  it("maps external module open to canonical taxonomy event", async () => {
    const result = await bridgeExternalTelemetry({
      source: "partner-analytics",
      event: "external_module_open",
      payload: {
        module: "News",
        href: "/news"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical.event).toBe("module_open");
    expect(result.canonical.surface).toBe("apps_directory");
    expect(result.canonical.module).toBe("News");
    expect(result.canonical.href).toBe("/news");
  });

  it("rejects telemetry from source not in enabled list", async () => {
    const result = await bridgeExternalTelemetry({
      source: "untrusted-partner",
      event: "external_module_open",
      payload: {
        module: "News"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("source_not_enabled");
  });
});
