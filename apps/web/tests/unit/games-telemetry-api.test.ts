import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: {
    platformEvent: {
      create: createMock
    }
  }
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
  resolveClientKey: vi.fn(() => "client-1:127.0.0.1")
}));

import { POST } from "@/app/api/games/telemetry/route";

describe("games telemetry api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createMock.mockResolvedValue({ id: "evt-1" });
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 10, retryAfterSec: 60 });
  });

  it("accepts valid telemetry events", async () => {
    const response = await POST(
      new Request("http://localhost/api/games/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "game.publish",
          timestamp: "2026-03-12T10:00:00.000Z",
          actorId: "anon_client",
          gameId: "game-1",
          surface: "games_create",
          templateId: "BREAKOUT_MICRO",
          href: "/games/user/game-1"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(checkRateLimitMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: "game.publish",
          module: "Games:game-1:BREAKOUT_MICRO",
          href: "/games/user/game-1",
          surface: "games_create"
        })
      })
    );
  });

  it("rejects invalid telemetry payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/games/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "game.publish",
          surface: "games_create"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rate limits noisy clients", async () => {
    checkRateLimitMock.mockResolvedValueOnce({ ok: false, remaining: 0, retryAfterSec: 30 });

    const response = await POST(
      new Request("http://localhost/api/games/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "games.open",
          timestamp: "2026-03-12T10:00:00.000Z",
          actorId: "anon_client",
          gameId: "breakout",
          surface: "games_detail"
        })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(createMock).not.toHaveBeenCalled();
  });
});
