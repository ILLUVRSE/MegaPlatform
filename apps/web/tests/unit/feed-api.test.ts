import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  feedPost: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  feedReaction: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  },
  feedComment: {
    create: vi.fn(),
    findMany: vi.fn()
  },
  feedReport: {
    create: vi.fn(),
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

import { GET as getFeed, POST as createFeed } from "@/app/api/feed/route";
import { POST as likeFeed } from "@/app/api/feed/[id]/like/route";
import { POST as createComment } from "@/app/api/feed/[id]/comments/route";
import { POST as createReport } from "@/app/api/feed/[id]/report/route";

describe("feed api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerSessionMock.mockResolvedValue(null);
    prismaMock.feedPost.findMany.mockResolvedValue([]);
    prismaMock.feedReaction.findMany.mockResolvedValue([]);
    prismaMock.feedComment.findMany.mockResolvedValue([]);
    prismaMock.feedPost.findUnique.mockResolvedValue({ likeCount: 0 });
    prismaMock.feedPost.create.mockResolvedValue({
      id: "post-1",
      type: "TEXT",
      authorId: null,
      authorProfile: "Anonymous",
      caption: "hello",
      createdAt: new Date(),
      updatedAt: new Date(),
      shortPostId: null,
      showId: null,
      episodeId: null,
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
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      reactions: [],
      shareOf: null,
      shortPost: null,
      show: null,
      episode: null,
      liveChannel: null
    });
    prismaMock.feedComment.create.mockResolvedValue({
      id: "comment-1",
      body: "nice",
      userId: null,
      anonId: "anon-1",
      createdAt: new Date()
    });
    prismaMock.feedReport.create.mockResolvedValue({ id: "report-1" });
    prismaMock.feedReport.findMany.mockResolvedValue([]);
  });

  it("lists wall feed posts for ranking", async () => {
    await getFeed(new Request("http://localhost/api/feed?mode=wall"));

    expect(prismaMock.feedPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: { notIn: ["SHORT", "MEME"] } }),
        orderBy: { id: "desc" }
      })
    );
  });

  it("returns wall feed with pagination shape", async () => {
    prismaMock.feedPost.findMany.mockResolvedValueOnce([
      {
        id: "feed-wall-1",
        type: "TEXT",
        authorId: null,
        authorProfile: "Anonymous",
        caption: "wall post",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        shortPostId: null,
        showId: null,
        episodeId: null,
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
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        reports: [],
        reactions: [],
        shortPost: null,
        show: null,
        episode: null,
        liveChannel: null,
        shareOf: null
      }
    ]);
    const response = await getFeed(new Request("http://localhost/api/feed"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].id).toBe("feed-wall-1");
  });

  it("returns ranked shorts feed when mode=shorts", async () => {
    prismaMock.feedPost.findMany.mockResolvedValueOnce([
      {
        id: "feed-1",
        type: "SHORT",
        authorId: null,
        authorProfile: "Creator",
        caption: "short one",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        shortPostId: "short-1",
        showId: null,
        episodeId: null,
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
        likeCount: 2,
        commentCount: 1,
        shareCount: 0,
        reports: [],
        reactions: [],
        shortPost: {
          id: "short-1",
          title: "Short 1",
          caption: "caption 1",
          mediaUrl: "https://cdn/short1.mp4",
          mediaType: "VIDEO",
          isPremium: false,
          price: null,
          publishedAt: new Date("2026-03-01T00:00:00.000Z"),
          _count: { purchases: 0 }
        }
      }
    ]);

    const response = await getFeed(new Request("http://localhost/api/feed?mode=shorts"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].type).toBe("SHORT");
    expect(prismaMock.feedPost.findMany).toHaveBeenCalled();
  });

  it("toggles like idempotently for anon and user", async () => {
    prismaMock.feedReaction.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "like-1" });

    await likeFeed(new Request("http://localhost/api/feed/post-1/like"), { params: Promise.resolve({ id: "post-1" }) });
    await likeFeed(new Request("http://localhost/api/feed/post-1/like"), { params: Promise.resolve({ id: "post-1" }) });

    expect(prismaMock.feedReaction.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.feedReaction.delete).toHaveBeenCalledTimes(1);

    getServerSessionMock.mockResolvedValueOnce({ user: { id: "user-1", role: "user" } });
    prismaMock.feedReaction.findFirst.mockResolvedValueOnce(null);

    await likeFeed(new Request("http://localhost/api/feed/post-1/like"), { params: Promise.resolve({ id: "post-1" }) });

    expect(prismaMock.feedReaction.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1" })
      })
    );
  });

  it("creates SHARE post and increments share count", async () => {
    await createFeed(
      new Request("http://localhost/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SHARE", shareOfId: "post-abc", caption: "repost" })
      })
    );

    expect(prismaMock.feedPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "SHARE", shareOfId: "post-abc" })
      })
    );

    expect(prismaMock.feedPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post-abc" },
        data: { shareCount: { increment: 1 } }
      })
    );
  });

  it("creates comment and increments comment count", async () => {
    await createComment(
      new Request("http://localhost/api/feed/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Nice post" })
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(prismaMock.feedComment.create).toHaveBeenCalled();
    expect(prismaMock.feedPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post-1" },
        data: { commentCount: { increment: 1 } }
      })
    );
  });

  it("creates reports", async () => {
    prismaMock.feedReport.findMany.mockResolvedValue([
      { reporterId: "u1", anonId: null },
      { reporterId: "u2", anonId: null },
      { reporterId: "u3", anonId: null },
      { reporterId: null, anonId: "anon-1" },
      { reporterId: null, anonId: "anon-2" }
    ]);

    await createReport(
      new Request("http://localhost/api/feed/post-1/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Spam", details: "Bot content" })
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(prismaMock.feedReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postId: "post-1", reason: "Spam" })
      })
    );
    expect(prismaMock.feedPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post-1" },
        data: expect.objectContaining({ isHidden: true })
      })
    );
  });
});
