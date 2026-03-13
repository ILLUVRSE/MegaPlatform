import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluatePartyPresenceHealth,
  getPartyReconnectDelayMs,
  PARTY_HEARTBEAT_TIMEOUT_MS
} from "@/lib/partyPresence";

const prismaMock = vi.hoisted(() => ({
  party: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  platformPresence: {
    upsert: vi.fn(),
    findMany: vi.fn()
  },
  participant: {
    findUnique: vi.fn()
  }
}));

const getStateMock = vi.hoisted(() => vi.fn());
const setStateMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());
const subscribeMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());
const requireAdminMock = vi.hoisted(() => vi.fn());
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
  publish: publishMock,
  subscribe: subscribeMock
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

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
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

import { POST as presencePingPost } from "@/app/api/party/[code]/presence/ping/route";
import { GET as partyEventsGet } from "@/app/api/party/[code]/events/route";
import { POST as voiceTokenPost } from "@/app/api/party/[code]/voice/token/route";
import { GET as adminPartyHealthGet } from "@/app/api/admin/party/health/route";

const stateFixture = () => ({
  partyId: "party-1",
  seatCount: 8,
  seats: {},
  playback: { currentIndex: 0, playbackState: "idle" as const },
  participants: {
    "host-1": {
      displayName: "Host",
      joinedAt: "2026-03-12T00:00:00.000Z",
      lastSeenAt: "2026-03-12T00:00:20.000Z"
    }
  },
  heartbeat: {
    lastSeenAt: "2026-03-12T00:00:20.000Z",
    lastHostHeartbeatAt: "2026-03-12T00:00:20.000Z",
    pingCount: 2
  },
  updatedAt: "2026-03-12T00:00:20.000Z"
});

describe("party reliability slos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T00:00:20.000Z"));
    vi.resetAllMocks();
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 10, retryAfterSec: 60 });
    requireSessionMock.mockResolvedValue({ userId: "host-1", role: "user", permissions: [] });
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    prismaMock.party.findUnique.mockResolvedValue({
      id: "party-1",
      code: "ABC123",
      hostId: "host-1",
      seats: Array.from({ length: 8 }, (_, idx) => ({ id: `seat-${idx + 1}` }))
    });
    prismaMock.party.findMany.mockResolvedValue([
      {
        id: "party-1",
        code: "ABC123",
        hostId: "host-1",
        seats: Array.from({ length: 8 }, (_, idx) => ({ id: `seat-${idx + 1}` }))
      }
    ]);
    prismaMock.participant.findUnique.mockResolvedValue({ displayName: "Host" });
    prismaMock.platformPresence.upsert.mockResolvedValue({});
    prismaMock.platformPresence.findMany.mockResolvedValue([]);
    getStateMock.mockResolvedValue(stateFixture());
    subscribeMock.mockResolvedValue(async () => {});
    isLiveKitConfiguredMock.mockReturnValue(true);
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks missed host heartbeats as an SLO breach and uses exponential reconnect backoff", () => {
    const nowMs = Date.parse("2026-03-12T00:01:00.000Z");
    const result = evaluatePartyPresenceHealth(
      {
        ...stateFixture(),
        participants: {
          "host-1": {
            displayName: "Host",
            joinedAt: "2026-03-12T00:00:00.000Z",
            lastSeenAt: new Date(nowMs - PARTY_HEARTBEAT_TIMEOUT_MS - 1).toISOString()
          }
        },
        heartbeat: {
          lastSeenAt: new Date(nowMs - PARTY_HEARTBEAT_TIMEOUT_MS - 1).toISOString(),
          lastHostHeartbeatAt: new Date(nowMs - PARTY_HEARTBEAT_TIMEOUT_MS - 1).toISOString(),
          pingCount: 4
        }
      },
      { hostId: "host-1", nowMs }
    );

    expect(result.slosMet).toBe(false);
    expect(result.heartbeatFresh).toBe(false);
    expect(result.hostHeartbeatFresh).toBe(false);
    expect(result.staleParticipantCount).toBe(1);
    expect(getPartyReconnectDelayMs(0)).toBe(1000);
    expect(getPartyReconnectDelayMs(4)).toBeGreaterThan(getPartyReconnectDelayMs(1));
  });

  it("updates heartbeat state and publishes keepalive plus authoritative host snapshot", async () => {
    const response = await presencePingPost(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ code: "ABC123" })
    });

    expect(response.status).toBe(200);
    expect(setStateMock).toHaveBeenCalledWith(
      "party-1",
      expect.objectContaining({
        heartbeat: expect.objectContaining({
          pingCount: 3
        })
      })
    );
    expect(publishMock).toHaveBeenCalledWith(
      "party-1",
      expect.objectContaining({ type: "keepalive", pingCount: 3 })
    );
    expect(publishMock).toHaveBeenCalledWith(
      "party-1",
      expect.objectContaining({ type: "snapshot", reason: "heartbeat" })
    );
  });

  it("replays the latest authoritative snapshot when the SSE stream reconnects", async () => {
    const response = await partyEventsGet(new Request("http://localhost/events"), {
      params: { code: "ABC123" }
    });

    expect(response.status).toBe(200);
    const reader = response.body?.getReader();
    expect(reader).toBeTruthy();
    const firstChunk = await reader?.read();
    const secondChunk = await reader?.read();
    const text =
      new TextDecoder().decode(firstChunk?.value ?? new Uint8Array()) +
      new TextDecoder().decode(secondChunk?.value ?? new Uint8Array());

    expect(text).toContain('"type":"snapshot"');
    expect(text).toContain('"reason":"initial"');
  });

  it("returns a graceful token-only LiveKit fallback when token issuance is unavailable", async () => {
    isLiveKitConfiguredMock.mockReturnValueOnce(false);

    const response = await voiceTokenPost(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ code: "ABC123" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        mode: "token-only",
        fallback: true,
        reason: "livekit_not_configured",
        roomName: "party-ABC123",
        identity: "host-1"
      })
    );
  });

  it("reports presence slos and last host heartbeat from the admin health endpoint", async () => {
    const response = await adminPartyHealthGet();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        ok: true,
        summary: expect.objectContaining({
          totalParties: 1,
          slosMetCount: 1
        }),
        presenceSLOs: [
          expect.objectContaining({
            code: "ABC123",
            pingCount: 2,
            lastHostHeartbeatAt: "2026-03-12T00:00:20.000Z",
            slosMet: true
          })
        ]
      })
    );
  });
});
