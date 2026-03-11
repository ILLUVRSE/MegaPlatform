import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRawMock = vi.hoisted(() => vi.fn());
const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: { $queryRaw: queryRawMock }
}));

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

import { GET as getRevenueAttribution } from "@/app/api/admin/creator/revenue-attribution/route";

describe("admin revenue attribution api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized without admin", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, session: null });
    const response = await getRevenueAttribution();
    expect(response.status).toBe(401);
  });

  it("returns attribution aggregates", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1", role: "admin" } } });
    queryRawMock.mockResolvedValue([
      { creatorprofileid: "cp-1", actiontype: "short_purchase", totalcents: 1200n, events: 3n },
      { creatorprofileid: "cp-2", actiontype: "short_purchase", totalcents: 800n, events: 2n }
    ]);

    const response = await getRevenueAttribution();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.totals.revenueCents).toBe(2000);
    expect(payload.creators).toHaveLength(2);
  });
});
