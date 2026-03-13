import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn()
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

import { getStudioEpisodeWatchAnalytics, getStudioShowWatchAnalytics } from "@/lib/studioWatchAnalytics";

describe("studio watch analytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns publish guidance when a show has not been synced to Watch", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "ep-1", status: "PUBLISHED" }])
      .mockResolvedValueOnce([{ count: 2 }]);

    const analytics = await getStudioShowWatchAnalytics("show-project-1");

    expect(analytics.publishedToWatch).toBe(false);
    expect(analytics.watchHref).toBeNull();
    expect(analytics.publishedEpisodes).toBe(1);
    expect(analytics.views.available).toBe(false);
    expect(analytics.publishedShorts.value).toBe(2);
  });

  it("aggregates show watch progress, likes, and linked shorts", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ id: "watch-show-1", slug: "nova" }])
      .mockResolvedValueOnce([
        { id: "studio-ep-1", status: "PUBLISHED" },
        { id: "studio-ep-2", status: "READY" }
      ])
      .mockResolvedValueOnce([{ count: 4 }])
      .mockResolvedValueOnce([{ id: "watch-ep-1" }])
      .mockResolvedValueOnce([{ count: 14 }])
      .mockResolvedValueOnce([{ likes: 9, posts: 3 }]);

    const analytics = await getStudioShowWatchAnalytics("show-project-1");

    expect(analytics.publishedToWatch).toBe(true);
    expect(analytics.watchHref).toBe("/watch/show/nova");
    expect(analytics.syncedWatchEpisodes).toBe(1);
    expect(analytics.views.value).toBe(14);
    expect(analytics.reactions.value).toBe(9);
    expect(analytics.publishedShorts.value).toBe(4);
  });

  it("aggregates episode metrics from the synced Watch episode", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ id: "watch-ep-9" }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([{ likes: 7, posts: 2 }]);

    const analytics = await getStudioEpisodeWatchAnalytics("studio-ep-9");

    expect(analytics.publishedToWatch).toBe(true);
    expect(analytics.watchHref).toBe("/watch/episode/watch-ep-9");
    expect(analytics.views.value).toBe(5);
    expect(analytics.reactions.value).toBe(7);
    expect(analytics.publishedShorts.value).toBe(3);
    expect(analytics.completions.available).toBe(false);
  });
});
