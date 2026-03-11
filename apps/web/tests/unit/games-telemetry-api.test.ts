import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $executeRaw: vi.fn()
}));

vi.mock("@illuvrse/db", () => ({
  prisma: {
    $executeRaw: prismaMock.$executeRaw
  }
}));

import { POST } from "@/app/api/games/telemetry/route";

describe("games telemetry api", () => {
  it("accepts valid telemetry events", async () => {
    prismaMock.$executeRaw.mockResolvedValue(1);

    const response = await POST(
      new Request("http://localhost/api/games/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "creator_publish",
          surface: "games_create",
          gameId: "game-1",
          templateId: "BREAKOUT_MICRO"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid telemetry payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/games/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "unknown_event",
          surface: "none"
        })
      })
    );

    expect(response.status).toBe(400);
  });
});
