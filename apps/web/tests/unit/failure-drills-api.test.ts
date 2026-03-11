import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());
const loadFailureDrillsMock = vi.hoisted(() => vi.fn());
const loadFailureDrillReportsMock = vi.hoisted(() => vi.fn());
const runFailureDrillMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: writeAuditMock
}));

vi.mock("@/lib/reliability", () => ({
  loadFailureDrills: loadFailureDrillsMock,
  loadFailureDrillReports: loadFailureDrillReportsMock,
  runFailureDrill: runFailureDrillMock
}));

import { GET, POST } from "@/app/api/admin/reliability/failure-drills/route";

describe("failure drills api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns drills and reports", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1", role: "admin" } } });
    loadFailureDrillsMock.mockResolvedValue([{ id: "queue-backlog-drill" }]);
    loadFailureDrillReportsMock.mockResolvedValue([{ drillId: "queue-backlog-drill", status: "pass" }]);

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.drills).toHaveLength(1);
    expect(payload.reports).toHaveLength(1);
  });

  it("runs a drill and writes an audit entry", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1", role: "admin" } } });
    runFailureDrillMock.mockResolvedValue({
      drill: { id: "queue-backlog-drill", target: "queue" },
      report: { status: "pass" }
    });

    const response = await POST(
      new Request("http://localhost/api/admin/reliability/failure-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drillId: "queue-backlog-drill" })
      })
    );

    expect(response.status).toBe(200);
    expect(writeAuditMock).toHaveBeenCalledTimes(1);
  });
});
