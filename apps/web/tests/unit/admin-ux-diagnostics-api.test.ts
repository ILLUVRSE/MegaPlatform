import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRawMock = vi.hoisted(() => vi.fn());
const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: { $queryRaw: queryRawMock }
}));

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

import { GET as getUxDiagnostics } from "@/app/api/admin/ux/diagnostics/route";

describe("admin ux diagnostics api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized for non-admin", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, session: null });
    const response = await getUxDiagnostics();
    expect(response.status).toBe(401);
  });

  it("returns ux diagnostics metrics", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1", role: "admin" } } });
    queryRawMock.mockResolvedValue([
      { event: "onboarding_started", count: 10n },
      { event: "onboarding_completed", count: 6n },
      { event: "onboarding_first_action", count: 7n },
      { event: "ux_hesitation", count: 3n },
      { event: "ux_rage_click", count: 1n },
      { event: "ux_dropoff", count: 2n }
    ]);

    const response = await getUxDiagnostics();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.onboarding.completionRate).toBe(0.6);
    expect(payload.friction.hesitation).toBe(3);
  });
});
