import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  contentQaResult: {
    findMany: vi.fn()
  }
}));

const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

import { GET } from "@/app/api/admin/studio/qa-results/route";

describe("admin studio qa results api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthorized access", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, session: null });

    const response = await GET(new Request("http://localhost/api/admin/studio/qa-results?projectId=proj-1"));

    expect(response.status).toBe(401);
  });

  it("requires projectId", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });

    const response = await GET(new Request("http://localhost/api/admin/studio/qa-results"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "projectId is required" });
  });

  it("returns audit-friendly qa history for a project", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    prismaMock.contentQaResult.findMany.mockResolvedValue([
      {
        id: "qa-2",
        projectId: "proj-1",
        status: "FAIL",
        technicalScore: 100,
        policyScore: 55,
        issuesJson: {
          issues: ["Caption contains high-risk policy term: extremist."],
          outcome: {
            status: "FAIL",
            passed: false,
            checksRun: ["asset-presence", "asset-kind", "caption-policy"],
            reporterId: "user-2",
            timestamp: "2026-03-12T10:00:00.000Z"
          }
        },
        checkedBy: "qa-agent-v1",
        createdAt: new Date("2026-03-12T10:00:00.000Z")
      },
      {
        id: "qa-1",
        projectId: "proj-1",
        status: "PASS",
        technicalScore: 100,
        policyScore: 100,
        issuesJson: {
          issues: [],
          outcome: {
            status: "PASS",
            passed: true,
            checksRun: ["asset-presence", "asset-kind", "caption-policy"],
            reporterId: "user-1",
            timestamp: "2026-03-11T09:00:00.000Z"
          }
        },
        checkedBy: "qa-agent-v1",
        createdAt: new Date("2026-03-11T09:00:00.000Z")
      }
    ]);

    const response = await GET(new Request("http://localhost/api/admin/studio/qa-results?projectId=proj-1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.contentQaResult.findMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      orderBy: { createdAt: "desc" }
    });
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: "qa-2",
        projectId: "proj-1",
        status: "FAIL",
        reporterId: "user-2",
        checksRun: ["asset-presence", "asset-kind", "caption-policy"],
        timestamp: "2026-03-12T10:00:00.000Z",
        outcome: expect.objectContaining({ passed: false })
      }),
      expect.objectContaining({
        id: "qa-1",
        projectId: "proj-1",
        status: "PASS",
        reporterId: "user-1",
        checksRun: ["asset-presence", "asset-kind", "caption-policy"],
        timestamp: "2026-03-11T09:00:00.000Z",
        outcome: expect.objectContaining({ passed: true })
      })
    ]);
  });
});
