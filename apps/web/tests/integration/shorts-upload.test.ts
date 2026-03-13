import { createHash } from "crypto";
import { writeFile } from "fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioProject: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  studioAsset: {
    create: vi.fn(),
    update: vi.fn()
  },
  agentJob: {
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
  contentQaResult: {
    create: vi.fn()
  },
  assetLineage: {
    upsert: vi.fn()
  },
  user: {
    findUnique: vi.fn()
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg === "function") {
      return arg(prismaMock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  })
}));

const requireSessionMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());
const resolveClientKeyMock = vi.hoisted(() => vi.fn());
const uploadBufferMock = vi.hoisted(() => vi.fn());
const enqueueStudioJobMock = vi.hoisted(() => vi.fn());
const generateThumbnailMock = vi.hoisted(() => vi.fn());
const ensureCreatorProfileMock = vi.hoisted(() => vi.fn());
const invalidateCdnKeysWithRetryMock = vi.hoisted(() => vi.fn());

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
  checkRateLimit: checkRateLimitMock,
  resolveClientKey: resolveClientKeyMock
}));

vi.mock("@illuvrse/storage", () => ({
  uploadBuffer: uploadBufferMock
}));

vi.mock("@illuvrse/agent-manager", async () => {
  const actual = await vi.importActual<typeof import("@illuvrse/agent-manager")>("@illuvrse/agent-manager");
  return {
    ...actual,
    enqueueStudioJob: enqueueStudioJobMock,
    generateThumbnail: generateThumbnailMock
  };
});

vi.mock("@/lib/creatorIdentity", () => ({
  ensureCreatorProfile: ensureCreatorProfileMock
}));

vi.mock("@/lib/cdnInvalidation", () => ({
  invalidateCdnKeysWithRetry: invalidateCdnKeysWithRetryMock
}));

import { POST as uploadShort } from "@/app/api/shorts/upload/route";
import { POST as publishShort } from "@/app/api/studio/projects/[id]/publish/route";

describe("shorts upload pipeline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return arg(prismaMock);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", name: "Creator", permissions: [] });
    checkRateLimitMock.mockResolvedValue({ ok: true });
    resolveClientKeyMock.mockReturnValue("client-1");
    uploadBufferMock.mockImplementation(async (key: string) => `https://cdn.example/${key}`);
    enqueueStudioJobMock.mockResolvedValue("queued-job-1");
    generateThumbnailMock.mockResolvedValue("/tmp/thumb.jpg");
    ensureCreatorProfileMock.mockResolvedValue({ id: "cp-1", displayName: "Creator" });
    invalidateCdnKeysWithRetryMock.mockResolvedValue({ ok: true, attempts: 1 });
    prismaMock.studioProject.findUnique
      .mockResolvedValueOnce({
        id: "proj-1",
        createdById: "user-1",
        type: "SHORT",
        title: "Uploaded Short",
        description: "Large upload"
      })
      .mockResolvedValueOnce({
        id: "proj-1",
        createdById: "user-1",
        type: "SHORT",
        title: "Uploaded Short",
        description: "Large upload",
        assets: [
          {
            id: "asset-video",
            kind: "HLS_MANIFEST",
            url: "https://cdn.example/shorts/proj-1/master.m3u8",
            storageKey: "shorts/proj-1/master.m3u8",
            metaJson: null
          },
          {
            id: "asset-thumb",
            kind: "THUMBNAIL",
            url: "https://cdn.example/shorts/proj-1/thumb.jpg",
            storageKey: "shorts/proj-1/thumb.jpg",
            metaJson: null
          }
        ]
      });
    prismaMock.studioAsset.create
      .mockResolvedValueOnce({ id: "upload-asset-1", uploadId: "upload-1" })
      .mockResolvedValueOnce({ id: "thumb-asset-1" });
    prismaMock.agentJob.create.mockResolvedValue({ id: "job-1" });
    prismaMock.shortPost.create.mockResolvedValue({ id: "post-1" });
    prismaMock.feedPost.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", name: "Creator", email: "c@example.com" });
  });

  it("streams a large upload, enqueues transcode, creates thumbnail, and invalidates CDN on publish", async () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024, "a");
    const checksum = createHash("sha256").update(largeBuffer).digest("hex");
    await writeFile("/tmp/thumb.jpg", Buffer.from("thumb"));

    const uploadRequest = new Request("http://localhost/api/shorts/upload", {
      method: "POST",
      headers: {
        "content-type": "video/mp4",
        "x-project-id": "proj-1",
        "x-checksum-sha256": checksum,
        "x-file-name": "large-upload.mp4",
        "x-title": "Uploaded Short",
        "x-caption": "Large upload"
      },
      body: largeBuffer
    });

    const uploadResponse = await uploadShort(uploadRequest);
    expect(uploadResponse.status).toBe(200);
    expect(prismaMock.agentJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "VIDEO_TRANSCODE"
        })
      })
    );
    expect(prismaMock.studioAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "THUMBNAIL"
        })
      })
    );
    expect(enqueueStudioJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "VIDEO_TRANSCODE"
      })
    );

    const publishRequest = new Request("http://localhost/api/studio/projects/proj-1/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Uploaded Short", caption: "Large upload" })
    });
    const publishResponse = await publishShort(publishRequest, { params: Promise.resolve({ id: "proj-1" }) });
    expect(publishResponse.status).toBe(200);
    expect(invalidateCdnKeysWithRetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keys: expect.arrayContaining(["shorts/proj-1/master.m3u8", "shorts/proj-1/thumb.jpg"])
      })
    );
  });
});
