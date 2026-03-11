import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EmbeddedPlatformApp from "@/app/components/EmbeddedPlatformApp";

const telemetryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/platformTelemetry", () => ({
  trackPlatformEvent: telemetryMock
}));

describe("embedded platform app", () => {
  it("tracks module open on mount and renders standardized metadata", () => {
    render(
      <EmbeddedPlatformApp
        app={{
          name: "News",
          title: "ILLUVRSE News",
          category: "Media",
          tagline: "Editorial and podcast intelligence across platform, gaming, and culture.",
          route: "/news",
          description: "Unified external app shell.",
          ctaLabel: "Open News",
          url: "http://localhost:3001"
        }}
      />
    );

    expect(screen.getByText("ILLUVRSE News")).toBeTruthy();
    expect(screen.getByText("Media")).toBeTruthy();
    expect(screen.getByText("External App")).toBeTruthy();
    expect(screen.getByTestId("embedded-platform-frame")).toBeTruthy();

    expect(telemetryMock).toHaveBeenCalledWith({
      event: "module_open",
      module: "News",
      href: "/news",
      surface: "embedded_app"
    });
  });
});
