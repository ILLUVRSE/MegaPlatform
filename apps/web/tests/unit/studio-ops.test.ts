/**
 * Unit tests for studio ops API routes.
 * Request/response: validates list filtering, retry, and cancel behavior.
 * Guard: mocks Prisma and agent manager dependencies.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  agentJob: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn()
  },
  studioProject: {
    update: vi.fn()
  },
  studioAsset: {
    findMany: vi.fn()
  }
}));

const enqueueStudioJobMock = vi.hoisted(() => vi.fn());
const buildStudioDedupeKeyMock = vi.hoisted(() => vi.fn((projectId: string, type: string) => `${projectId}:${type}`));
const getStudioQueueMock = vi.hoisted(() => vi.fn(() => ({ remove: vi.fn() })));
const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@illuvrse/agent-manager", () => ({
  enqueueStudioJob: enqueueStudioJobMock,
  getStudioQueue: getStudioQueueMock,
  buildStudioDedupeKey: buildStudioDedupeKeyMock,
  STUDIO_JOB_ATTEMPTS: 5
}));

vi.mock("@/lib/authz", () => ({
  AuthzError: class AuthzError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.status = status;
    }
  },
  requireAdmin: requireAdminMock
}));

import { GET as listJobs } from "@/app/api/studio/ops/jobs/route";
import { POST as retryJob } from "@/app/api/studio/ops/jobs/[id]/retry/route";
import { POST as cancelJob } from "@/app/api/studio/ops/jobs/[id]/cancel/route";
import { GET as queueHealth } from "@/app/api/admin/studio/queue-health/route";

describe("studio ops APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    buildStudioDedupeKeyMock.mockImplementation((projectId: string, type: string) => `${projectId}:${type}`);
    requireAdminMock.mockResolvedValue({ userId: "admin-1", role: "admin", permissions: ["admin:*"] });
    prismaMock.agentJob.findFirst.mockResolvedValue(null);
  });

  it("lists jobs with filters", async () => {
    prismaMock.agentJob.findMany.mockResolvedValueOnce([
      {
        id: "job-1",
        projectId: "project-1",
        type: "SHORT_SCRIPT",
        status: "FAILED",
        attempts: 2,
        maxAttempts: 5,
        retryable: false,
        lastError: "boom",
        outputJson: { attempts: 2 },
        error: "boom",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:10Z"),
        project: { title: "Nebula" }
      }
    ]);

    const request = new Request(
      "http://localhost/api/studio/ops/jobs?status=FAILED&type=SHORT_SCRIPT&sinceHours=24&limit=50"
    );
    const response = await listJobs(request);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { jobs: Array<{ id: string; attempts: number }> };
    expect(payload.jobs).toHaveLength(1);
    expect(payload.jobs[0].id).toBe("job-1");
    expect(payload.jobs[0].attempts).toBe(2);
  });

  it("retries failed jobs", async () => {
    prismaMock.agentJob.findUnique.mockResolvedValueOnce({
      id: "job-1",
      projectId: "project-1",
      type: "SHORT_SCRIPT",
      status: "FAILED",
      inputJson: { prompt: "hi" }
    });

    prismaMock.agentJob.create.mockResolvedValueOnce({
      id: "job-2",
      projectId: "project-1",
      type: "SHORT_SCRIPT",
      inputJson: { prompt: "hi" }
    });

    const response = await retryJob(new Request("http://localhost"), { params: Promise.resolve({ id: "job-1" }) });
    expect(response.status).toBe(200);
    expect(prismaMock.agentJob.create).toHaveBeenCalledWith({
      data: {
        projectId: "project-1",
        type: "SHORT_SCRIPT",
        status: "QUEUED",
        inputJson: expect.objectContaining({
          prompt: "hi",
          dedupeKey: "project-1:SHORT_SCRIPT",
          maxAttempts: 5,
          retriedFromJobId: "job-1"
        })
      }
    });
    expect(enqueueStudioJobMock).toHaveBeenCalledWith({
      jobId: "job-2",
      projectId: "project-1",
      type: "SHORT_SCRIPT",
      input: { prompt: "hi" },
      dedupeKey: "project-1:SHORT_SCRIPT"
    });
  });

  it("blocks retry when a matching job is already in flight", async () => {
    prismaMock.agentJob.findUnique.mockResolvedValueOnce({
      id: "job-1",
      projectId: "project-1",
      type: "SHORT_SCRIPT",
      status: "FAILED",
      inputJson: { prompt: "hi" }
    });
    prismaMock.agentJob.findFirst.mockResolvedValueOnce({ id: "job-active" });

    const response = await retryJob(new Request("http://localhost"), { params: Promise.resolve({ id: "job-1" }) });
    expect(response.status).toBe(409);
    expect(prismaMock.agentJob.create).not.toHaveBeenCalled();
    expect(enqueueStudioJobMock).not.toHaveBeenCalled();
  });

  it("cancels jobs", async () => {
    prismaMock.agentJob.findUnique.mockResolvedValueOnce({
      id: "job-3",
      projectId: "project-1",
      status: "PROCESSING"
    });

    const response = await cancelJob(new Request("http://localhost"), { params: Promise.resolve({ id: "job-3" }) });
    expect(response.status).toBe(200);
    expect(prismaMock.agentJob.update).toHaveBeenCalledWith({
      where: { id: "job-3" },
      data: { status: "FAILED", error: "Cancelled" }
    });
  });

  it("rejects unauthorized access", async () => {
    requireAdminMock.mockRejectedValueOnce(new Error("Unauthorized"));
    const response = await listJobs(new Request("http://localhost/api/studio/ops/jobs"));
    expect(response.status).toBe(401);
  });

  it("returns queue health with retry and failure indicators", async () => {
    getStudioQueueMock.mockReturnValueOnce({
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 1,
        active: 2,
        completed: 3,
        failed: 1,
        delayed: 1,
        paused: 0
      })
    });
    prismaMock.agentJob.groupBy
      .mockResolvedValueOnce([
        { status: "QUEUED", _count: { status: 1 } },
        { status: "FAILED", _count: { status: 1 } }
      ])
      .mockResolvedValueOnce([
        { type: "SHORT_RENDER", _count: { type: 2 } }
      ]);
    prismaMock.agentJob.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prismaMock.agentJob.findMany.mockResolvedValueOnce([
      {
        id: "job-1",
        projectId: "project-1",
        type: "SHORT_RENDER",
        status: "FAILED",
        attempts: 2,
        maxAttempts: 5,
        retryable: false,
        lastError: "render failed",
        error: "render failed",
        outputJson: { durationMs: 1200 },
        createdAt: new Date("2026-03-12T00:00:00Z"),
        updatedAt: new Date("2026-03-12T00:00:02Z")
      }
    ]);

    const response = await queueHealth(new Request("http://localhost/api/admin/studio/queue-health"));
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.counts.total).toBe(4);
    expect(payload.counts.retrying).toBe(1);
    expect(payload.indicators.hasFailuresLast24h).toBe(true);
    expect(payload.queue.failed).toBe(1);
    expect(payload.recentErrors[0].lastError).toBe("render failed");
  });
});
