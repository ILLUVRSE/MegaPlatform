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
  },
  participant: {
    findUnique: vi.fn()
  }
}));

const getStateMock = vi.hoisted(() => vi.fn());
const setStateMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/world-state", () => ({
  getState: getStateMock,
  setState: setStateMock,
  publish: publishMock
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

import { POST as appendPlaylistPost } from "@/app/api/party/[code]/playlist/append/route";
import { POST as presencePingPost } from "@/app/api/party/[code]/presence/ping/route";
import { POST as voiceTokenPost } from "@/app/api/party/[code]/voice/token/route";

describe("party phase 6 hardening", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 99, retryAfterSec: 60 });
    requireSessionMock.mockResolvedValue({ userId: "host-1", role: "user", permissions: [] });
    prismaMock.party.findUnique.mockResolvedValue({
      id: "party-1",
      code: "ABC123",
      hostId: "host-1",
      seats: Array.from({ length: 8 }, (_, idx) => ({ id: `seat-${idx + 1}`, seatIndex: idx + 1 }))
    });
    prismaMock.shortPost.findUnique.mockResolvedValue({ id: "short-1", mediaUrl: "https://cdn/short.m3u8" });
    prismaMock.playlistItem.count.mockResolvedValue(0);
    prismaMock.playlistItem.findFirst.mockResolvedValue(null);
    getStateMock.mockResolvedValue({
      partyId: "party-1",
      seatCount: 8,
      seats: {},
      playback: { currentIndex: 0, playbackState: "idle" },
      participants: {},
      updatedAt: new Date().toISOString()
    });
  });

  it("blocks non-host playlist append", async () => {
    requireSessionMock.mockResolvedValueOnce({ userId: "user-2", role: "user", permissions: [] });
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortPostId: "short-1", position: "append" })
    });
    const response = await appendPlaylistPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(403);
  });

  it("updates presence on heartbeat ping", async () => {
    prismaMock.participant.findUnique.mockResolvedValueOnce({ displayName: "Host" });
    const request = new Request("http://localhost", { method: "POST" });
    const response = await presencePingPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(200);
    expect(setStateMock).toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledWith(
      "party-1",
      expect.objectContaining({ type: "presence_update", status: "updated", userId: "host-1" })
    );
  });

  it("returns 503 for voice token when livekit is not configured", async () => {
    delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    prismaMock.participant.findUnique.mockResolvedValueOnce({ displayName: "Host" });
    const request = new Request("http://localhost", { method: "POST" });
    const response = await voiceTokenPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(503);
  });
});
