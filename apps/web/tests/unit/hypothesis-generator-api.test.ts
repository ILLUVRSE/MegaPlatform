import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());
const createTaskMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/audit", () => ({ writeAudit: writeAuditMock }));
vi.mock("@illuvrse/agent-manager", () => ({ createTask: createTaskMock }));

import { POST } from "@/app/api/admin/optimization/hypotheses/generate/route";

describe("hypothesis generator api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    createTaskMock.mockResolvedValue({ id: "task-1", title: "Hypothesis: watch_drop" });
  });

  it("generates hypothesis tasks from anomalies", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/optimization/hypotheses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anomalies: [{ signal: "watch_drop", deltaRatio: -0.3 }]
        })
      })
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.tasks.length).toBe(1);
    expect(writeAuditMock).toHaveBeenCalledTimes(1);
  });
});
