import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());
const loadWorkflowsMock = vi.hoisted(() => vi.fn());
const loadEvidenceMock = vi.hoisted(() => vi.fn());
const runDsarRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/audit", () => ({ writeAudit: writeAuditMock }));
vi.mock("@/lib/dsar", () => ({
  loadDsarWorkflows: loadWorkflowsMock,
  loadDsarEvidence: loadEvidenceMock,
  runDsarRequest: runDsarRequestMock
}));

import { GET, POST } from "@/app/api/admin/compliance/dsar/requests/route";

describe("dsar api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns workflows and evidence", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    loadWorkflowsMock.mockResolvedValue([{ type: "export" }]);
    loadEvidenceMock.mockResolvedValue([{ requestId: "dsar-1" }]);
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("processes request and writes audit", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    runDsarRequestMock.mockResolvedValue({ requestId: "dsar-1", type: "export", userId: "u-1", status: "completed" });
    const response = await POST(
      new Request("http://localhost/api/admin/compliance/dsar/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: "dsar-1", type: "export", userId: "u-1" })
      })
    );
    expect(response.status).toBe(200);
    expect(writeAuditMock).toHaveBeenCalledTimes(1);
  });
});
