/**
 * Unit tests for studio publish pipeline.
 * Request/response: validates ShortPost creation from assets.
 * Guard: mocks Prisma and authz session checks.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioProject: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  studioAsset: {
    update: vi.fn()
  },
  assetLineage: {
    upsert: vi.fn()
  },
  contentQaResult: {
    create: vi.fn()
  },
  shortPost: {
    create: vi.fn()
  },
  feedPost: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  user: {
    findUnique: vi.fn()
  }
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

const requireSessionMock = vi.hoisted(() => vi.fn());
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
const ensureCreatorProfileMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/creatorIdentity", () => ({
  ensureCreatorProfile: ensureCreatorProfileMock
}));

import { POST as publishProject } from "@/app/api/studio/projects/[id]/publish/route";

describe("studio publish", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", permissions: [] });
    ensureCreatorProfileMock.mockResolvedValue({ id: "cp-1", displayName: "Creator" });
    prismaMock.studioProject.findUnique.mockResolvedValue({
      id: "proj-1",
      createdById: "user-1",
      type: "SHORT",
      title: "Test",
      description: "Caption",
      assets: [{ id: "asset-1", kind: "SHORT_MP4", url: "https://cdn/short.mp4", metaJson: null }]
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", name: "Creator", email: "c@x.com" });
    prismaMock.shortPost.create.mockResolvedValue({ id: "post-1" });
    prismaMock.feedPost.findFirst.mockResolvedValue(null);
  });

  it("creates a ShortPost from render asset", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", caption: "Caption" })
    });

    const response = await publishProject(request, { params: { id: "proj-1" } });
    expect(response.status).toBe(200);
    expect(prismaMock.shortPost.create).toHaveBeenCalled();
    expect(prismaMock.feedPost.create).toHaveBeenCalled();
    expect(prismaMock.assetLineage.upsert).toHaveBeenCalled();
    expect(prismaMock.contentQaResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          status: "PASS",
          issuesJson: expect.objectContaining({
            issues: [],
            outcome: expect.objectContaining({
              status: "PASS",
              passed: true,
              reporterId: "user-1",
              checksRun: ["asset-presence", "asset-kind", "caption-policy"],
              timestamp: expect.any(String)
            })
          }),
          createdAt: expect.any(Date)
        })
      })
    );
    expect(prismaMock.studioAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          temporary: false,
          metaJson: expect.objectContaining({
            lifecycleState: "published",
            projectId: "proj-1",
            publishedById: "user-1",
            publishedPostId: "post-1",
            temporary: false
          })
        })
      })
    );
  });

  it("blocks publish when QA fails", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "extremist content" })
    });

    const response = await publishProject(request, { params: { id: "proj-1" } });
    expect(response.status).toBe(409);
    expect(prismaMock.shortPost.create).not.toHaveBeenCalled();
    expect(prismaMock.contentQaResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAIL",
          issuesJson: expect.objectContaining({
            outcome: expect.objectContaining({
              status: "FAIL",
              passed: false,
              reporterId: "user-1"
            }),
            issues: expect.arrayContaining([
              expect.stringContaining("extremist")
            ])
          })
        })
      })
    );
  });
});
