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
  resolveClientKey: vi.fn(() => "telemetry-client:127.0.0.1")
}));

import { POST } from "@/app/api/games/telemetry/route";

describe("games telemetry ingestion e2e", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createMock.mockImplementation(async ({ data }) => ({ id: `evt_${data.event}`, ...data }));
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 100, retryAfterSec: 60 });
  });

  it("ingests validated catalog, open, embed, and publish events into PlatformEvent", async () => {
    const events = [
      {
        eventType: "games.catalog.view",
        timestamp: "2026-03-12T10:00:00.000Z",
        actorId: "anon_catalog",
        gameId: "games-catalog",
        surface: "games_catalog",
        href: "/games"
      },
      {
        eventType: "games.open",
        timestamp: "2026-03-12T10:00:01.000Z",
        actorId: "anon_catalog",
        gameId: "breakout",
        gameSlug: "breakout",
        surface: "games_detail",
        href: "/games/breakout"
      },
      {
        eventType: "game.embed.load",
        timestamp: "2026-03-12T10:00:02.000Z",
        actorId: "anon_catalog",
        gameId: "breakout",
        gameSlug: "breakout",
        surface: "games_detail",
        href: "https://cdn.example.com/embed/breakout?autoplay=1\n"
      },
      {
        eventType: "game.publish",
        timestamp: "2026-03-12T10:00:03.000Z",
        actorId: "creator_7",
        gameId: "game-42",
        surface: "games_create",
        templateId: "BREAKOUT_MICRO",
        href: "/games/user/game-42"
      }
    ];

    for (const event of events) {
      const response = await POST(
        new Request("http://localhost/api/games/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
          body: JSON.stringify(event)
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    }

    expect(createMock).toHaveBeenCalledTimes(4);
    expect(createMock.mock.calls.map(([arg]) => arg.data)).toEqual([
      expect.objectContaining({
        event: "games.catalog.view",
        module: "Games:games-catalog",
        href: "/games",
        surface: "games_catalog"
      }),
      expect.objectContaining({
        event: "games.open",
        module: "Games:breakout",
        href: "/games/breakout",
        surface: "games_detail"
      }),
      expect.objectContaining({
        event: "game.embed.load",
        module: "Games:breakout",
        href: "https://cdn.example.com/embed/breakout?autoplay=1",
        surface: "games_detail"
      }),
      expect.objectContaining({
        event: "game.publish",
        module: "Games:game-42:BREAKOUT_MICRO",
        href: "/games/user/game-42",
        surface: "games_create"
      })
    ]);
  });
});
