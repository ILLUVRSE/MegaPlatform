import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());
const resolveClientKeyMock = vi.hoisted(() => vi.fn(() => "client-key"));
const findOpsRootMock = vi.hoisted(() => vi.fn());
const buildBriefingMock = vi.hoisted(() => vi.fn(() => "# Daily Briefing\n"));
const writeBriefingMock = vi.hoisted(() => vi.fn());
const moveTaskMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
  resolveClientKey: resolveClientKeyMock
}));

vi.mock("@/lib/ops", () => ({
  OPS_ROLES: [
    "Content Ops",
    "Feed & Moderation",
    "Party Ops",
    "Live Scheduler",
    "Studio Pipeline",
    "Quality/Analytics",
    "Customer Support",
    "Ops/SRE",
    "Frontend",
    "Backend",
    "Infra"
  ],
  findOpsRoot: findOpsRootMock,
  buildBriefing: buildBriefingMock,
  writeBriefing: writeBriefingMock,
  moveTask: moveTaskMock
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: writeAuditMock
}));

import { POST as saveBriefing } from "@/app/api/admin/ops/briefing/route";
import { POST as updateTask } from "@/app/api/admin/ops/tasks/[id]/route";

describe("admin ops api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    checkRateLimitMock.mockResolvedValue({ ok: true });
    findOpsRootMock.mockResolvedValue("/tmp/ops");
    moveTaskMock.mockResolvedValue({ id: "task-1", status: "done" });
  });

  it("rejects invalid briefing payload", async () => {
    const response = await saveBriefing(
      new Request("http://localhost/api/admin/ops/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: { "Unknown": ["x"] } })
      })
    );

    expect(response.status).toBe(400);
    expect(writeBriefingMock).not.toHaveBeenCalled();
  });

  it("saves valid briefing and writes audit", async () => {
    const response = await saveBriefing(
      new Request("http://localhost/api/admin/ops/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: { "Ops/SRE": ["Check queue lag"] }, notes: "n" })
      })
    );

    expect(response.status).toBe(200);
    expect(writeBriefingMock).toHaveBeenCalled();
    expect(writeAuditMock).toHaveBeenCalledWith(
      "admin-1",
      "OPS_BRIEFING_SAVED",
      expect.any(String)
    );
  });

  it("updates task status and writes audit", async () => {
    const response = await updateTask(
      new Request("http://localhost/api/admin/ops/tasks/task-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" })
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(response.status).toBe(200);
    expect(moveTaskMock).toHaveBeenCalledWith("/tmp/ops", "task-1", "done");
    expect(writeAuditMock).toHaveBeenCalledWith(
      "admin-1",
      "OPS_TASK_STATUS_UPDATED",
      expect.any(String)
    );
  });
});
