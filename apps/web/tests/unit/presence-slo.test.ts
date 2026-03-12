import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  party: {
    findMany: vi.fn()
  },
  platformPresence: {
    findMany: vi.fn()
  }
}));

const getStateMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/world-state", () => ({
  getState: getStateMock
}));

import { buildPartyPresenceSummary } from "@/lib/platformPresence";

describe("party presence slo evaluation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T00:00:45.000Z"));
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates presence_up_fraction, median_reconnect_ms, and host_availability", async () => {
    prismaMock.party.findMany.mockResolvedValue([
      {
        id: "party-1",
        code: "ROOM1",
        hostId: "host-1",
        seats: [{ id: "seat-1" }, { id: "seat-2" }]
      },
      {
        id: "party-2",
        code: "ROOM2",
        hostId: "host-2",
        seats: [{ id: "seat-3" }]
      }
    ]);
    prismaMock.platformPresence.findMany.mockResolvedValue([
      {
        module: "party-room:party-1",
        metadataJson: { roomId: "party-1", roomCode: "ROOM1", reconnectMs: 2000 },
        lastSeenAt: new Date("2026-03-12T00:00:43.000Z")
      },
      {
        module: "party-room:party-2",
        metadataJson: { roomId: "party-2", roomCode: "ROOM2", reconnectMs: 6000 },
        lastSeenAt: new Date("2026-03-12T00:00:42.000Z")
      }
    ]);
    getStateMock
      .mockResolvedValueOnce({
        participants: {
          "host-1": {
            displayName: "Host 1",
            joinedAt: "2026-03-12T00:00:00.000Z",
            lastSeenAt: "2026-03-12T00:00:44.000Z"
          },
          "guest-1": {
            displayName: "Guest 1",
            joinedAt: "2026-03-12T00:00:01.000Z",
            lastSeenAt: "2026-03-12T00:00:44.000Z"
          }
        },
        heartbeat: {
          lastSeenAt: "2026-03-12T00:00:44.000Z",
          lastHostHeartbeatAt: "2026-03-12T00:00:44.000Z",
          pingCount: 6
        }
      })
      .mockResolvedValueOnce({
        participants: {
          "host-2": {
            displayName: "Host 2",
            joinedAt: "2026-03-12T00:00:00.000Z",
            lastSeenAt: "2026-03-12T00:00:05.000Z"
          }
        },
        heartbeat: {
          lastSeenAt: "2026-03-12T00:00:05.000Z",
          lastHostHeartbeatAt: "2026-03-12T00:00:05.000Z",
          pingCount: 2
        }
      });

    const summary = await buildPartyPresenceSummary({ nowMs: Date.now() });

    expect(summary.metrics.presence_up_fraction).toBe(0.5);
    expect(summary.metrics.median_reconnect_ms).toBe(4000);
    expect(summary.metrics.host_availability).toBe(0.5);
    expect(summary.slosMet).toBe(false);
    expect(summary.summary.degradedRooms).toBe(1);
    expect(summary.recentBreaches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roomCode: "ROOM2",
          metricKey: "presence_up_fraction"
        }),
        expect.objectContaining({
          roomCode: "ROOM2",
          metricKey: "host_availability"
        })
      ])
    );
  });
});
