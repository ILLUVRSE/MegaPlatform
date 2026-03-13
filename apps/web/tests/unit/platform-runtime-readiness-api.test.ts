import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const evaluatePlatformRuntimeReadinessMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

vi.mock("@/lib/platformRuntimeReadiness", () => ({
  evaluatePlatformRuntimeReadiness: evaluatePlatformRuntimeReadinessMock
}));

import { GET as getPlatformRuntimeReadiness } from "@/app/api/admin/platform/runtime-readiness/route";

describe("platform runtime readiness api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized for non-admin", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, session: null });

    const response = await getPlatformRuntimeReadiness();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns blocker details and summary for admins", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1", role: "admin" } } });
    evaluatePlatformRuntimeReadinessMock.mockReturnValue({
      ok: false,
      missingDocs: [],
      missingApis: [],
      missingRuntimeFiles: [],
      missingGovernanceManifests: ["ops/governance/slos.json"],
      missingSloIds: ["studio-failure-rate-24h"],
      missingLaunchGateIds: [],
      unregisteredRequiredApis: [],
      apiRegistry: {
        path: "docs/api-registry.web.json",
        routeCount: 1,
        generatedRouteCount: 2,
        driftDetected: true
      },
      blockers: [
        { category: "governance_manifests", item: "ops/governance/slos.json" },
        { category: "slos", item: "studio-failure-rate-24h" },
        { category: "api_registry", item: "docs/api-registry.web.json out of date" }
      ],
      summary: {
        blockerCount: 3,
        topBlockers: [{ category: "governance_manifests", item: "ops/governance/slos.json" }]
      },
      checkedAt: "2026-03-13T00:00:00.000Z",
      phases: [310]
    });

    const response = await getPlatformRuntimeReadiness();

    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.summary.blockerCount).toBe(3);
    expect(payload.apiRegistry.driftDetected).toBe(true);
    expect(payload.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "governance_manifests" })])
    );
  });
});
