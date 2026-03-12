import { describe, expect, it, vi } from "vitest";

const createMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: {
    platformEvent: {
      create: createMock
    }
  }
}));

import { POST } from "@/app/api/platform/events/route";

describe("platform events api", () => {
  it("accepts valid telemetry events", async () => {
    createMock.mockResolvedValue({ id: "evt-1" });

    const response = await POST(
      new Request("http://localhost/api/platform/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "module_open",
          module: "GameGrid",
          href: "/gamegrid",
          surface: "home_hub"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid telemetry payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/platform/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "not-real",
          module: "",
          href: "",
          surface: "none"
        })
      })
    );

    expect(response.status).toBe(400);
  });
});
