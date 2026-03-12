import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioProject: {
    findUnique: vi.fn()
  },
  studioAsset: {
    create: vi.fn()
  }
}));

const requireSessionMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/authz", () => ({
  AuthzError: class AuthzError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.status = status;
    }
  },
  requireSession: requireSessionMock
}));

vi.mock("@/lib/rateLimit", () => ({
  resolveClientKey: () => "user:ip",
  checkRateLimit: checkRateLimitMock
}));

import { POST as createStudioAsset } from "@/app/api/studio/projects/[id]/assets/route";

describe("studio assets api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "creator-1", role: "user", permissions: [] });
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 39, retryAfterSec: 60 });
    prismaMock.studioProject.findUnique.mockResolvedValue({ id: "project-1", createdById: "creator-1" });
    prismaMock.studioAsset.create.mockResolvedValue({
      id: "asset-1",
      kind: "SHORT_MP4",
      url: "https://cdn.example/short.mp4"
    });
  });

  it("creates generated draft assets with lifecycle metadata", async () => {
    const request = new Request("http://localhost/api/studio/projects/project-1/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "SHORT_MP4",
        url: "https://cdn.example/short.mp4",
        metaJson: { sourceJobId: "job-1" }
      })
    });

    const response = await createStudioAsset(request, { params: Promise.resolve({ id: "project-1" }) });

    expect(response.status).toBe(200);
    expect(prismaMock.studioAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-1",
          kind: "SHORT_MP4",
          temporary: true,
          metaJson: expect.objectContaining({
            lifecycleState: "draft_asset",
            projectId: "project-1",
            sourceJobId: "job-1"
          })
        })
      })
    );
  });

  it("rejects direct upload asset creation on the generic route", async () => {
    const request = new Request("http://localhost/api/studio/projects/project-1/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "IMAGE_UPLOAD",
        url: "https://cdn.example/upload.png"
      })
    });

    const response = await createStudioAsset(request, { params: Promise.resolve({ id: "project-1" }) });

    expect(response.status).toBe(400);
    expect(prismaMock.studioAsset.create).not.toHaveBeenCalled();
  });
});
