/**
 * Unit tests for watch live API.
 */
import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  liveChannel: {
    findMany: vi.fn()
  },
  liveProgram: {
    findMany: vi.fn()
  }
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

import { GET as liveChannelsGet } from "@/app/api/watch/live/channels/route";

describe("watch live channels API", () => {
  it("returns active channels with now/next programs", async () => {
    prismaMock.liveChannel.findMany.mockResolvedValueOnce([
      {
        id: "channel-1",
        slug: "illuvrse-news",
        name: "ILLUVRSE News",
        description: null,
        logoUrl: null,
        heroUrl: null,
        category: "News",
        streamUrl: "https://stream.m3u8",
        isActive: true,
        lastCheckedAt: new Date(),
        lastHealthyAt: new Date()
      }
    ]);

    prismaMock.liveProgram.findMany.mockResolvedValueOnce([
      {
        id: "program-1",
        channelId: "channel-1",
        title: "Live Update",
        startsAt: new Date(Date.now() - 5 * 60 * 1000),
        endsAt: new Date(Date.now() + 10 * 60 * 1000)
      },
      {
        id: "program-2",
        channelId: "channel-1",
        title: "News Hour",
        startsAt: new Date(Date.now() + 10 * 60 * 1000),
        endsAt: new Date(Date.now() + 40 * 60 * 1000)
      }
    ]);

    const response = await liveChannelsGet();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      channels: Array<{
        now: { title: string } | null;
        next: { title: string } | null;
        health: { status: string; isHealthy: boolean };
      }>;
    };
    expect(payload.channels[0].now?.title).toBe("Live Update");
    expect(payload.channels[0].next?.title).toBe("News Hour");
    expect(payload.channels[0].health.isHealthy).toBe(true);
  });
});
