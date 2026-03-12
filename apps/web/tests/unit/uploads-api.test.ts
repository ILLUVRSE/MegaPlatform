/**
 * Unit tests for signed upload APIs.
 * Request/response: validates allowlist and asset creation.
 * Guard: mocks Prisma and storage dependencies.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioProject: {
    findUnique: vi.fn()
  },
  studioAsset: {
    findFirst: vi.fn(),
    create: vi.fn()
  }
}));

const getSignedUploadUrlMock = vi.hoisted(() => vi.fn());
const getPublicUrlMock = vi.hoisted(() => vi.fn());
const headObjectMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());
const resolveClientKeyMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/storage", () => ({
  getSignedUploadUrl: getSignedUploadUrlMock,
  getPublicUrl: getPublicUrlMock,
  headObject: headObjectMock
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
  checkRateLimit: checkRateLimitMock,
  resolveClientKey: resolveClientKeyMock
}));

import { POST as signUpload } from "@/app/api/uploads/sign/route";
import { POST as finalizeUpload } from "@/app/api/uploads/finalize/route";

describe("upload APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "creator-1", role: "user", permissions: [] });
    prismaMock.studioProject.findUnique.mockResolvedValue({ id: "project-1", createdById: "creator-1" });
    prismaMock.studioAsset.findFirst.mockResolvedValue(null);
    resolveClientKeyMock.mockReturnValue("creator-1");
    checkRateLimitMock.mockResolvedValue({ ok: true });
    getSignedUploadUrlMock.mockResolvedValue({
      uploadUrl: "https://signed-upload",
      signedAt: "2026-03-11T00:00:00.000Z",
      expiresInSec: 600
    });
    getPublicUrlMock.mockImplementation((key: string) => `https://public/${key}`);
  });

  it("rejects invalid upload ids", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        filename: "test.gif",
        contentType: "image/gif",
        uploadId: "!!!"
      })
    });

    const response = await signUpload(request);
    expect(response.status).toBe(400);
  });

  it("rejects missing projects", async () => {
    prismaMock.studioProject.findUnique.mockResolvedValue(null);
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        filename: "big.png",
        contentType: "image/png",
        uploadId: "upload-123"
      })
    });

    const response = await signUpload(request);
    expect(response.status).toBe(404);
  });

  it("returns signed upload info", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        filename: "image.png",
        contentType: "image/png",
        uploadId: "upload-123",
        contentLength: 1024
      })
    });

    const response = await signUpload(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      objectKey: string;
      uploadUrl: string;
      publicUrl: string;
      signedAt: string;
      expiresInSec: number;
    };
    expect(payload.objectKey).toBe("projects/project-1/uploads/upload-123/image.png");
    expect(payload.uploadUrl).toBe("https://signed-upload");
    expect(payload.publicUrl).toContain(payload.objectKey);
    expect(payload.signedAt).toBe("2026-03-11T00:00:00.000Z");
    expect(payload.expiresInSec).toBe(600);
  });

  it("rejects unauthenticated upload signing", async () => {
    requireSessionMock.mockRejectedValueOnce(new Error("Unauthorized"));
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        filename: "image.png",
        contentType: "image/png",
        uploadId: "upload-123"
      })
    });
    const response = await signUpload(request);
    expect(response.status).toBe(401);
  });

  it("finalizes upload and creates asset", async () => {
    headObjectMock.mockResolvedValue({ contentType: "image/png", contentLength: 1024 });
    prismaMock.studioAsset.create.mockResolvedValue({
      id: "asset-1",
      url: "https://public/studio/uploads/project-1/file.png",
      kind: "IMAGE_UPLOAD"
    });

    const key = "studio/uploads/project-1/file.png";
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        kind: "IMAGE_UPLOAD",
        key,
        publicUrl: `https://public/${key}`,
        contentType: "image/png",
        contentLength: 1024
      })
    });

    const response = await finalizeUpload(request);
    expect(response.status).toBe(200);
    expect(prismaMock.studioAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-1",
          kind: "IMAGE_UPLOAD",
          url: `https://public/${key}`,
          metaJson: expect.objectContaining({
            lifecycleState: "uploaded",
            projectId: "project-1",
            uploadKind: "IMAGE_UPLOAD",
            uploadedById: "creator-1",
            temporary: true
          })
        })
      })
    );
  });

  it("rejects finalization when key does not match project namespace", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        kind: "IMAGE_UPLOAD",
        key: "studio/uploads/project-2/file.png",
        publicUrl: "https://public/studio/uploads/project-2/file.png",
        contentType: "image/png",
        contentLength: 1024
      })
    });

    const response = await finalizeUpload(request);
    expect(response.status).toBe(400);
  });
});
