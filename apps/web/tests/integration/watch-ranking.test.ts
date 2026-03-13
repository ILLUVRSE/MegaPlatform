import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  feedPost: {
    findMany: vi.fn()
  },
  feedReaction: {
    findMany: vi.fn()
  },
  feedComment: {
    findMany: vi.fn()
  }
}));

const getServerSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock
}));

import { GET as getFeed } from "@/app/api/feed/route";

function makePost({
  id,
  createdAt,
  likeCount,
  commentCount,
  shareCount
}: {
  id: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}) {
  return {
    id,
    type: "WATCH_EPISODE",
    authorId: null,
    authorProfile: "Creator",
    caption: id,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    shortPostId: null,
    showId: null,
    episodeId: "ep-1",
    liveChannelId: null,
    gameKey: null,
    linkUrl: null,
    uploadUrl: null,
    shareOfId: null,
    isHidden: false,
    isShadowbanned: false,
    isPinned: false,
    isFeatured: false,
    featuredRank: 0,
    likeCount,
    commentCount,
    shareCount,
    reports: [],
    reactions: [],
    shortPost: null,
    show: null,
    episode: { id: "ep-1", title: "Episode", lengthSeconds: 1800, assetUrl: "https://cdn/ep.mp4" },
    liveChannel: null,
    shareOf: null
  };
}

describe("watch ranking integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T12:00:00.000Z"));
    getServerSessionMock.mockResolvedValue(null);
    prismaMock.feedReaction.findMany.mockResolvedValue([]);
    prismaMock.feedComment.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prioritizes newly trending watch posts over older steady posts", async () => {
    prismaMock.feedPost.findMany.mockResolvedValueOnce([
      makePost({
        id: "older-steady",
        createdAt: "2026-03-10T12:00:00.000Z",
        likeCount: 12,
        commentCount: 2,
        shareCount: 1
      }),
      makePost({
        id: "fresh-trending",
        createdAt: "2026-03-13T11:00:00.000Z",
        likeCount: 6,
        commentCount: 4,
        shareCount: 3
      })
    ]);

    const response = await getFeed(new Request("http://localhost/api/feed?mode=wall"));
    const payload = (await response.json()) as { items: Array<{ id: string }> };

    expect(payload.items.map((item) => item.id)).toEqual(["fresh-trending", "older-steady"]);
  });

  it("caps low-engagement rapid posts so they do not leapfrog healthier items", async () => {
    prismaMock.feedPost.findMany.mockResolvedValueOnce([
      makePost({
        id: "rapid-low-quality",
        createdAt: "2026-03-13T11:30:00.000Z",
        likeCount: 0,
        commentCount: 1,
        shareCount: 0
      }),
      makePost({
        id: "healthy-recent",
        createdAt: "2026-03-13T09:00:00.000Z",
        likeCount: 3,
        commentCount: 2,
        shareCount: 1
      })
    ]);

    const response = await getFeed(new Request("http://localhost/api/feed?mode=wall"));
    const payload = (await response.json()) as { items: Array<{ id: string }> };

    expect(payload.items.map((item) => item.id)).toEqual(["healthy-recent", "rapid-low-quality"]);
  });
});
