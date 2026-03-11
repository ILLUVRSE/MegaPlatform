/**
 * Unit tests for playlist append API.
 * Request/response: validates ordering and playlist updates.
 * Guard: mocks Prisma and world-state dependencies.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  party: {
    findUnique: vi.fn()
  },
  shortPost: {
    findUnique: vi.fn()
  },
  playlistItem: {
    count: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn()
  }
}));

const publishMock = vi.hoisted(() => vi.fn());
const getStateMock = vi.hoisted(() => vi.fn());
const setStateMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/world-state", () => ({
  publish: publishMock,
  getState: getStateMock,
  setState: setStateMock
}));

vi.mock("@/lib/authz", () => ({
  AuthzError: class AuthzError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.status = status;
    }
  },
  requireSession: requireSessionMock
}));

vi.mock("@/lib/rateLimit", () => ({
  resolveClientKey: () => "user:ip",
  checkRateLimit: checkRateLimitMock
}));

import { POST as appendPost } from "@/app/api/party/[code]/playlist/append/route";

describe("playlist append API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "host-1", role: "user", permissions: [] });
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 59, retryAfterSec: 60 });
    getStateMock.mockResolvedValue({
      partyId: "party-1",
      seatCount: 8,
      seats: {},
      playback: { currentIndex: 0, playbackState: "idle" },
      participants: {},
      updatedAt: new Date().toISOString()
    });
  });

  it("appends a short to the end", async () => {
    prismaMock.party.findUnique.mockResolvedValueOnce({
      id: "party-1",
      hostId: "host-1",
      currentIndex: 0,
      seats: Array.from({ length: 8 }, (_, idx) => ({ id: `seat-${idx}` }))
    });
    prismaMock.shortPost.findUnique.mockResolvedValueOnce({
      id: "short-1",
      mediaUrl: "https://cdn/short.mp4"
    });
    prismaMock.playlistItem.count.mockResolvedValueOnce(3);
    prismaMock.playlistItem.findFirst.mockResolvedValueOnce({ order: 2 });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortPostId: "short-1" })
    });

    const response = await appendPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(200);
    expect(prismaMock.playlistItem.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.playlistItem.create).toHaveBeenCalledWith({
      data: {
        partyId: "party-1",
        episodeId: null,
        assetUrl: "https://cdn/short.mp4",
        order: 3
      }
    });
    expect(publishMock).toHaveBeenCalledWith(
      "party-1",
      expect.objectContaining({ type: "playlist_update", playlistLength: 4 })
    );
  });

  it("inserts next after current index", async () => {
    prismaMock.party.findUnique.mockResolvedValueOnce({
      id: "party-1",
      hostId: "host-1",
      currentIndex: 0,
      seats: Array.from({ length: 8 }, (_, idx) => ({ id: `seat-${idx}` }))
    });
    prismaMock.shortPost.findUnique.mockResolvedValueOnce({
      id: "short-1",
      mediaUrl: "https://cdn/short.m3u8"
    });
    prismaMock.playlistItem.count.mockResolvedValueOnce(3);
    prismaMock.playlistItem.findFirst.mockResolvedValueOnce({ order: 2 });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortPostId: "short-1", position: "next" })
    });

    const response = await appendPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(200);
    expect(prismaMock.playlistItem.updateMany).toHaveBeenCalledWith({
      where: { partyId: "party-1", order: { gte: 1 } },
      data: { order: { increment: 1 } }
    });
    expect(prismaMock.playlistItem.create).toHaveBeenCalledWith({
      data: {
        partyId: "party-1",
        episodeId: null,
        assetUrl: "https://cdn/short.m3u8",
        order: 1
      }
    });
  });
});
