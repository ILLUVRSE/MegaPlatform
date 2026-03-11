import { describe, expect, it } from "vitest";
import { normalizeInternalRoute, resolveDirectLaunchUrl, resolveEmbeddedRoute } from "@/lib/platformRoutes";

describe("platform routing contract", () => {
  it("normalizes internal route", () => {
    expect(normalizeInternalRoute("/news")).toBe("/news");
    expect(normalizeInternalRoute("news")).toBe("/news");
    expect(normalizeInternalRoute("")).toBe("/");
  });

  it("resolves embedded route from directory entry", () => {
    expect(
      resolveEmbeddedRoute({
        name: "News",
        href: "news",
        category: "Media",
        summary: "summary",
        type: "external"
      })
    ).toBe("/news");
  });

  it("resolves direct launch URL with fallback", () => {
    expect(
      resolveDirectLaunchUrl({
        name: "News",
        href: "/news",
        category: "Media",
        summary: "summary",
        type: "external",
        launchUrl: "http://localhost:3001"
      })
    ).toBe("http://localhost:3001");

    expect(
      resolveDirectLaunchUrl({
        name: "Watch",
        href: "/watch",
        category: "Streaming",
        summary: "summary",
        type: "core"
      })
    ).toBe("/watch");
  });
});
