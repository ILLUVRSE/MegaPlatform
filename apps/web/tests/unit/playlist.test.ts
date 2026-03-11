/**
 * Unit tests for party playlist API.
 * Request/response: validates ordering and host guard.
 * Guard: mocks Prisma and world-state dependencies.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  party: {
    findUnique: vi.fn()
  },
  episode: {
    findMany: vi.fn()
  },
  playlistItem: {
    deleteMany: vi.fn(),
    createMany: vi.fn()
  }
}));

const publishMock = vi.hoisted(() => vi.fn());
const getStateMock = vi.hoisted(() => vi.fn());
const setStateMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());

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

import { PUT as playlistPut } from "@/app/api/party/[code]/playlist/route";

describe("playlist API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "host-1", role: "user", permissions: [] });
    getStateMock.mockResolvedValue({
      partyId: "party-1",
      seatCount: 12,
      seats: {},
      playback: { currentIndex: 0, playbackState: "idle" },
      participants: {},
      updatedAt: new Date().toISOString()
    });
  });

  it("rejects non-host updates", async () => {
    prismaMock.party.findUnique.mockResolvedValueOnce({
      id: "party-1",
      hostId: "host-1",
      seats: []
    });

    const request = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: []
      })
    });

    requireSessionMock.mockResolvedValueOnce({ userId: "other-host", role: "user", permissions: [] });
    const response = await playlistPut(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(403);
  });

  it("persists playlist in order", async () => {
    prismaMock.party.findUnique.mockResolvedValueOnce({
      id: "party-1",
      hostId: "host-1",
      seats: []
    });

    prismaMock.episode.findMany.mockResolvedValueOnce([
      { id: "ep-1", assetUrl: "https://cdn/1.mp4" },
      { id: "ep-2", assetUrl: "https://cdn/2.mp4" }
    ]);

    const request = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { episodeId: "ep-1", order: 0 },
          { episodeId: "ep-2", order: 1 }
        ]
      })
    });

    const response = await playlistPut(request, { params: Promise.resolve({ code: "ABC123" }) });
    expect(response.status).toBe(200);
    expect(prismaMock.playlistItem.createMany).toHaveBeenCalledWith({
      data: [
        { partyId: "party-1", episodeId: "ep-1", assetUrl: "https://cdn/1.mp4", order: 0 },
        { partyId: "party-1", episodeId: "ep-2", assetUrl: "https://cdn/2.mp4", order: 1 }
      ]
    });
  });
});
