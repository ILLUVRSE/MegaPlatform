import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());
const loadPoliciesMock = vi.hoisted(() => vi.fn());
const loadEvidenceMock = vi.hoisted(() => vi.fn());
const runRetentionJobsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rbac", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/audit", () => ({ writeAudit: writeAuditMock }));
vi.mock("@/lib/dataRetention", () => ({
  loadRetentionPolicies: loadPoliciesMock,
  loadRetentionEvidence: loadEvidenceMock,
  runRetentionJobs: runRetentionJobsMock
}));

import { GET, POST } from "@/app/api/admin/compliance/retention/jobs/route";

describe("data retention api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns retention policies and evidence", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    loadPoliciesMock.mockResolvedValue([{ id: "retention-platform-events" }]);
    loadEvidenceMock.mockResolvedValue([{ policyId: "retention-platform-events", status: "pass" }]);

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.policies).toHaveLength(1);
  });

  it("runs retention jobs and audits", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    runRetentionJobsMock.mockResolvedValue([{ jobId: "retention-1", status: "pass" }]);

    const response = await POST();
    expect(response.status).toBe(200);
    expect(writeAuditMock).toHaveBeenCalledTimes(1);
  });
});
