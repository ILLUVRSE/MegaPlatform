import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());
const loadActionsMock = vi.hoisted(() => vi.fn());
const runAutomationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/audit", () => ({ writeAudit: writeAuditMock }));
vi.mock("@/lib/incidentAutomation", () => ({
  loadIncidentAutomationActions: loadActionsMock,
  runIncidentAutomation: runAutomationMock
}));

import { GET, POST } from "@/app/api/admin/incidents/automation/route";

describe("incident automation api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists automation actions", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "a-1" } } });
    loadActionsMock.mockResolvedValue([{ id: "pause-risky-retries" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.actions).toHaveLength(1);
  });

  it("triggers an allowed automation action", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "a-1" } } });
    runAutomationMock.mockResolvedValue({
      action: { id: "pause-risky-retries" },
      denied: false,
      execution: { status: "triggered", steps: [] }
    });

    const response = await POST(
      new Request("http://localhost/api/admin/incidents/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: "pause-risky-retries", severity: "SEV-2" })
      })
    );

    expect(response.status).toBe(200);
    expect(writeAuditMock).toHaveBeenCalledTimes(1);
  });
});
