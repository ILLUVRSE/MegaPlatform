import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  party: {
    findUnique: vi.fn()
  },
  platformPresence: {
    upsert: vi.fn()
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
const insertPlatformEventMock = vi.hoisted(() => vi.fn());
const isLiveKitConfiguredMock = vi.hoisted(() => vi.fn());
const getLiveKitServerConfigMock = vi.hoisted(() => vi.fn());
const createLiveKitAccessTokenMock = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/platformEvents", () => ({
  PLATFORM_EVENT_NAMES: {
    partyVoiceTokenIssued: "party.voice.token.issued"
  },
  insertPlatformEvent: insertPlatformEventMock
}));

vi.mock("@/lib/livekitToken", () => ({
  isLiveKitConfigured: isLiveKitConfiguredMock,
  getLiveKitServerConfig: getLiveKitServerConfigMock,
  createLiveKitAccessToken: createLiveKitAccessTokenMock
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
    prismaMock.participant.findUnique.mockResolvedValue({ displayName: "Host" });
    prismaMock.platformPresence.upsert.mockResolvedValue({});
    getStateMock.mockResolvedValue({
      partyId: "party-1",
      seatCount: 8,
      seats: {},
      playback: { currentIndex: 0, playbackState: "idle" },
      participants: {},
      heartbeat: { lastSeenAt: null, lastHostHeartbeatAt: null, pingCount: 0 },
      updatedAt: new Date().toISOString()
    });
    isLiveKitConfiguredMock.mockReturnValue(false);
    getLiveKitServerConfigMock.mockReturnValue({
      url: "wss://livekit.example",
      apiKey: "api-key",
      apiSecret: "api-secret"
    });
    createLiveKitAccessTokenMock.mockReturnValue({
      token: "token-123",
      expiresInSec: 3600
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
    const request = new Request("http://localhost", { method: "POST" });
    const response = await presencePingPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(200);
    expect(setStateMock).toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledWith(
      "party-1",
      expect.objectContaining({ type: "presence_update", status: "updated", userId: "host-1" })
    );
  });

  it("returns graceful fallback for voice token when livekit is not configured", async () => {
    isLiveKitConfiguredMock.mockReturnValueOnce(false);
    const request = new Request("http://localhost", { method: "POST" });
    const response = await voiceTokenPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ mode: "token-only", fallback: true, reason: "livekit_not_configured" })
    );
  });

  it("issues voice token and emits telemetry for authorized participants", async () => {
    isLiveKitConfiguredMock.mockReturnValueOnce(true);
    const request = new Request("http://localhost", { method: "POST" });
    const response = await voiceTokenPost(request, { params: Promise.resolve({ code: "ABC123" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        mode: "token",
        token: "token-123",
        url: "wss://livekit.example",
        identity: "host-1",
        roomName: "party-ABC123",
        expiresInSec: 3600
      })
    );
    expect(insertPlatformEventMock).toHaveBeenCalledWith({
      event: "party.voice.token.issued",
      module: "Party:ABC123",
      href: "/party/ABC123",
      surface: "party_voice"
    });
  });
});
