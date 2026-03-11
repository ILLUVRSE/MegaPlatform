import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  remixJob: {
    findMany: vi.fn(),
    create: vi.fn()
  },
  studioAsset: {
    findUnique: vi.fn()
  },
  contentQaResult: {
    findFirst: vi.fn()
  },
  studioProject: {
    create: vi.fn()
  }
}));
const requireSessionMock = vi.hoisted(() => vi.fn());
const ensureCreatorProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/authz", () => ({ requireSession: requireSessionMock, AuthzError: class extends Error { status = 401; } }));
vi.mock("@/lib/creatorIdentity", () => ({ ensureCreatorProfile: ensureCreatorProfileMock }));

import { GET as listRemixJobs, POST as createRemixJob } from "@/app/api/studio/remix/jobs/route";

describe("remix jobs API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", name: "Creator", email: "c@x.com" });
    ensureCreatorProfileMock.mockResolvedValue({ id: "cp-1" });
  });

  it("lists caller remix jobs", async () => {
    prismaMock.remixJob.findMany.mockResolvedValue([]);
    const response = await listRemixJobs(new Request("http://localhost/api/studio/remix/jobs"));
    expect(response.status).toBe(200);
  });

  it("blocks remix when lineage is missing", async () => {
    prismaMock.studioAsset.findUnique.mockResolvedValue({
      id: "asset-1",
      projectId: "proj-1",
      project: { title: "Source", description: null },
      lineage: null
    });
    const response = await createRemixJob(
      new Request("http://localhost/api/studio/remix/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceAssetId: "asset-1" })
      })
    );
    expect(response.status).toBe(409);
  });

  it("creates remix job when lineage + QA are valid", async () => {
    prismaMock.studioAsset.findUnique.mockResolvedValue({
      id: "asset-1",
      projectId: "proj-1",
      project: { title: "Source", description: "desc" },
      lineage: { rightsStatus: "OWNED" }
    });
    prismaMock.contentQaResult.findFirst.mockResolvedValue({ id: "qa-1", status: "PASS" });
    prismaMock.studioProject.create.mockResolvedValue({ id: "proj-remix-1" });
    prismaMock.remixJob.create.mockResolvedValue({ id: "rj-1" });

    const response = await createRemixJob(
      new Request("http://localhost/api/studio/remix/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceAssetId: "asset-1", prompt: "make it neon" })
      })
    );
    expect(response.status).toBe(200);
    expect(prismaMock.remixJob.create).toHaveBeenCalled();
  });
});
