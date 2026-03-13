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
const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/world-state", () => ({
  getState: getStateMock
}));

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

import {
  setPartyPresenceAlertDispatcherForTests
} from "@/lib/platformPresence";
import { GET as presenceSummaryGet } from "@/app/api/admin/party/presence-summary/route";

describe("party presence summary integration", () => {
  const alertHook = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T00:01:00.000Z"));
    vi.resetAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    prismaMock.party.findMany.mockResolvedValue([
      {
        id: "party-1",
        code: "ROOM1",
        hostId: "host-1",
        seats: [{ id: "seat-1" }]
      }
    ]);
    prismaMock.platformPresence.findMany.mockResolvedValue([
      {
        module: "party-room:party-1",
        metadataJson: { roomId: "party-1", roomCode: "ROOM1", reconnectMs: 9000 },
        lastSeenAt: new Date("2026-03-12T00:00:55.000Z")
      }
    ]);
    getStateMock.mockResolvedValue({
      participants: {
        "host-1": {
          displayName: "Host",
          joinedAt: "2026-03-12T00:00:00.000Z",
          lastSeenAt: "2026-03-12T00:00:10.000Z"
        }
      },
      heartbeat: {
        lastSeenAt: "2026-03-12T00:00:10.000Z",
        lastHostHeartbeatAt: "2026-03-12T00:00:10.000Z",
        pingCount: 1
      }
    });
    setPartyPresenceAlertDispatcherForTests(alertHook);
  });

  afterEach(() => {
    setPartyPresenceAlertDispatcherForTests(null);
    vi.useRealTimers();
  });

  it("calls the alert hook when the presence summary detects degraded rooms", async () => {
    const response = await presenceSummaryGet();

    expect(response.status).toBe(200);
    expect(alertHook).toHaveBeenCalledTimes(1);
    expect(alertHook).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({
          slosMet: false,
          recentBreaches: expect.arrayContaining([
            expect.objectContaining({
              roomCode: "ROOM1",
              metricKey: "median_reconnect_ms"
            })
          ])
        })
      })
    );
  });
});
