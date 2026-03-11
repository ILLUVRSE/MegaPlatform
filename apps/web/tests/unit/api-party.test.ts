/**
 * Unit tests for party API routes.
 * Request/response: validates API guards and conflict responses.
 * Guard: mocks Prisma and world-state dependencies.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  party: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  seat: {
    update: vi.fn()
  },
  playlistItem: {
    count: vi.fn()
  }
}));

const reserveSeatMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());
const getStateMock = vi.hoisted(() => vi.fn());
const setStateMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/world-state", () => ({
  reserveSeat: reserveSeatMock,
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

import { POST as reservePost } from "@/app/api/party/[code]/reserve/route";
import { POST as playbackPost } from "@/app/api/party/[code]/playback/route";

const partyFixture = {
  id: "party-1",
  code: "ABC123",
  hostId: "host-1",
  seats: Array.from({ length: 12 }, (_, idx) => ({
    id: `seat-${idx + 1}`,
    seatIndex: idx + 1,
    locked: false
  }))
};

describe("party APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", permissions: [] });
    prismaMock.playlistItem.count.mockResolvedValue(0);
    getStateMock.mockResolvedValue({
      partyId: "party-1",
      seatCount: 12,
      seats: {},
      playback: { currentIndex: 0, playbackState: "idle" },
      participants: {},
      updatedAt: new Date().toISOString()
    });
  });

  it("returns 409 when seat is already reserved", async () => {
    prismaMock.party.findUnique.mockResolvedValueOnce(partyFixture);
    reserveSeatMock.mockResolvedValueOnce({ ok: false, reason: "reserved" });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIndex: 2 })
    });

    const response = await reservePost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(409);
  });

  it("reserves seat when available", async () => {
    prismaMock.party.findUnique.mockResolvedValueOnce(partyFixture);
    reserveSeatMock.mockResolvedValueOnce({ ok: true, refreshed: false });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIndex: 3 })
    });

    const response = await reservePost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(200);
  });

  it("prevents non-host playback updates", async () => {
    prismaMock.party.findUnique.mockResolvedValueOnce(partyFixture);

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "play",
        leaderTime: Date.now(),
        playbackPositionMs: 0,
        currentIndex: 0,
        playbackState: "playing"
      })
    });

    const response = await playbackPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(403);
  });

  it("rejects unauthenticated host actions", async () => {
    requireSessionMock.mockRejectedValueOnce(new Error("Unauthorized"));
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "play",
        leaderTime: Date.now(),
        playbackPositionMs: 0,
        currentIndex: 0,
        playbackState: "playing"
      })
    });
    const response = await playbackPost(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(401);
  });
});
