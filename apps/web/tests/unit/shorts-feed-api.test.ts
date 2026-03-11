import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  shortPost: {
    findMany: vi.fn(),
    findUnique: vi.fn()
  },
  shortPurchase: {
    findFirst: vi.fn()
  }
}));

const getServerSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock
}));

import { GET as listShorts } from "@/app/api/shorts/route";
import { GET as shortDetail } from "@/app/api/shorts/[id]/route";

describe("shorts feed APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerSessionMock.mockResolvedValue(null);
    prismaMock.shortPurchase.findFirst.mockResolvedValue(null);
  });

  it("sorts shorts by computed score and excludes moderated entries", async () => {
    prismaMock.shortPost.findMany.mockResolvedValueOnce([
      {
        id: "short-a",
        projectId: null,
        title: "A",
        caption: "A",
        mediaUrl: "https://cdn/a.mp4",
        mediaType: "VIDEO",
        isPremium: false,
        price: null,
        createdAt: new Date("2026-03-03T00:00:00.000Z"),
        publishedAt: new Date("2026-03-03T00:00:00.000Z"),
        _count: { purchases: 0 },
        feedPosts: [
          {
            id: "feed-a",
            type: "SHORT",
            caption: "A",
            isHidden: false,
            isShadowbanned: false,
            isPinned: false,
            isFeatured: false,
            featuredRank: 0,
            likeCount: 1,
            commentCount: 1,
            shareCount: 0,
            reports: []
          }
        ]
      },
      {
        id: "short-b",
        projectId: null,
        title: "B",
        caption: "B",
        mediaUrl: "https://cdn/b.mp4",
        mediaType: "VIDEO",
        isPremium: false,
        price: null,
        createdAt: new Date("2026-03-03T00:00:00.000Z"),
        publishedAt: new Date("2026-03-03T00:00:00.000Z"),
        _count: { purchases: 2 },
        feedPosts: [
          {
            id: "feed-b",
            type: "SHORT",
            caption: "B",
            isHidden: false,
            isShadowbanned: false,
            isPinned: true,
            isFeatured: true,
            featuredRank: 3,
            likeCount: 8,
            commentCount: 2,
            shareCount: 1,
            reports: []
          }
        ]
      },
      {
        id: "short-c",
        projectId: null,
        title: "C",
        caption: "C",
        mediaUrl: "https://cdn/c.mp4",
        mediaType: "VIDEO",
        isPremium: false,
        price: null,
        createdAt: new Date("2026-03-03T00:00:00.000Z"),
        publishedAt: new Date("2026-03-03T00:00:00.000Z"),
        _count: { purchases: 0 },
        feedPosts: [
          {
            id: "feed-c",
            type: "SHORT",
            caption: "C",
            isHidden: true,
            isShadowbanned: false,
            isPinned: false,
            isFeatured: false,
            featuredRank: 0,
            likeCount: 100,
            commentCount: 100,
            shareCount: 100,
            reports: []
          }
        ]
      }
    ]);

    const response = await listShorts(new Request("http://localhost/api/shorts?limit=10"));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { posts: Array<{ id: string }> };
    expect(payload.posts.map((item) => item.id)).toEqual(["short-b", "short-a"]);
  });

  it("returns 400 on invalid query", async () => {
    const response = await listShorts(new Request("http://localhost/api/shorts?limit=500"));
    expect(response.status).toBe(400);
  });

  it("hides moderated short details", async () => {
    prismaMock.shortPost.findUnique.mockResolvedValueOnce({
      id: "short-z",
      projectId: null,
      title: "Z",
      caption: "Z",
      mediaUrl: "https://cdn/z.mp4",
      mediaType: "VIDEO",
      isPremium: false,
      price: null,
      createdAt: new Date(),
      publishedAt: new Date(),
      _count: { purchases: 0 },
      feedPosts: [
        {
          id: "feed-z",
          caption: "Z",
          isHidden: false,
          isShadowbanned: true,
          reports: []
        }
      ]
    });

    const response = await shortDetail(new Request("http://localhost"), {
      params: Promise.resolve({ id: "short-z" })
    });
    expect(response.status).toBe(404);
  });
});

