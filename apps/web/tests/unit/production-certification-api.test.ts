import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const buildStatusMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({ prisma: { $queryRaw: vi.fn() } }));
vi.mock("@/lib/rbac", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/productionCertification", () => ({ buildProductionCertificationStatus: buildStatusMock }));
vi.mock("@/lib/audit", () => ({ writeAudit: writeAuditMock }));

import { GET, POST } from "@/app/api/admin/launch/certification/route";

describe("production certification api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
  });

  it("returns certification status", async () => {
    buildStatusMock.mockResolvedValue({ checks: [], blockers: [], certifiable: true, generatedAt: "x" });
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("blocks certification when blockers exist", async () => {
    buildStatusMock.mockResolvedValue({
      checks: [],
      blockers: [{ id: "cert-launch-readiness" }],
      certifiable: false,
      generatedAt: "x"
    });
    const response = await POST(
      new Request("http://localhost/api/admin/launch/certification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: "r-1" })
      })
    );
    expect(response.status).toBe(409);
  });
});
