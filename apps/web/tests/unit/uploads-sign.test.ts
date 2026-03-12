import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioProject: {
    findUnique: vi.fn()
  }
}));

const getSignedUploadUrlMock = vi.hoisted(() => vi.fn());
const getPublicUrlMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());
const resolveClientKeyMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/storage", () => ({
  getSignedUploadUrl: getSignedUploadUrlMock,
  getPublicUrl: getPublicUrlMock
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

import { POST } from "@/app/api/uploads/sign/route";

describe("POST /api/uploads/sign", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "creator-1", role: "user", permissions: [] });
    resolveClientKeyMock.mockReturnValue("creator-1");
    checkRateLimitMock.mockResolvedValue({ ok: true });
    prismaMock.studioProject.findUnique.mockResolvedValue({ id: "project-1", createdById: "creator-1" });
    getSignedUploadUrlMock.mockResolvedValue({
      uploadUrl: "https://minio.local/presigned-put",
      expiresInSec: 600,
      signedAt: "2026-03-11T00:00:00.000Z"
    });
    getPublicUrlMock.mockImplementation((key: string) => `https://cdn.example/${key}`);
  });

  it("returns a deterministic object key and presigned URL", async () => {
    const request = new Request("http://localhost/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        filename: "My Clip!.mp4",
        contentType: "video/mp4",
        uploadId: "upload-abc123"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(getSignedUploadUrlMock).toHaveBeenCalledWith({
      key: "projects/project-1/uploads/upload-abc123/My-Clip.mp4",
      contentType: "video/mp4",
      contentLength: undefined,
      expiresInSec: 600
    });

    const payload = await response.json();
    expect(payload.objectKey).toBe("projects/project-1/uploads/upload-abc123/My-Clip.mp4");
    expect(payload.uploadUrl).toBe("https://minio.local/presigned-put");
    expect(payload.expiresInSec).toBe(600);
    expect(payload.signedAt).toBe("2026-03-11T00:00:00.000Z");
  });

  it("rejects non-owners", async () => {
    prismaMock.studioProject.findUnique.mockResolvedValue({ id: "project-1", createdById: "creator-2" });

    const request = new Request("http://localhost/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        filename: "clip.mp4",
        contentType: "video/mp4",
        uploadId: "upload-abc123"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("allows admins to sign uploads for other creators' projects", async () => {
    requireSessionMock.mockResolvedValue({ userId: "admin-1", role: "admin", permissions: [] });
    prismaMock.studioProject.findUnique.mockResolvedValue({ id: "project-1", createdById: "creator-2" });

    const request = new Request("http://localhost/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        filename: "clip.mp4",
        contentType: "video/mp4",
        uploadId: "upload-abc123"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.objectKey).toBe("projects/project-1/uploads/upload-abc123/clip.mp4");
  });
});
