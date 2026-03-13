/**
 * Unit tests for studio job orchestration.
 * Request/response: validates queue enqueue behavior.
 * Guard: mocks Prisma and agent-manager queue.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioProject: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  agentJob: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn()
  }
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

const enqueueStudioJob = vi.hoisted(() => vi.fn());
const buildStudioDedupeKey = vi.hoisted(() => vi.fn((projectId: string, type: string) => `${projectId}:${type}`));
const requireSessionMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@illuvrse/agent-manager", () => ({
  enqueueStudioJob,
  buildStudioDedupeKey,
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
  requireSession: requireSessionMock
}));
vi.mock("@/lib/rateLimit", () => ({
  resolveClientKey: () => "u:ip",
  checkRateLimit: checkRateLimitMock
}));

import { POST as createJob } from "@/app/api/studio/projects/[id]/jobs/route";

describe("studio jobs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    buildStudioDedupeKey.mockImplementation((projectId: string, type: string) => `${projectId}:${type}`);
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", permissions: [] });
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 29, retryAfterSec: 60 });
    prismaMock.studioProject.findUnique.mockResolvedValue({ id: "proj-1", createdById: "user-1" });
    prismaMock.agentJob.create.mockResolvedValue({ id: "job-1", status: "QUEUED" });
    prismaMock.agentJob.findUnique.mockResolvedValue({ id: "job-1", status: "QUEUED" });
    prismaMock.agentJob.findFirst.mockResolvedValue(null);
  });

  it("enqueues a script job", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SHORT_SCRIPT", input: { prompt: "Test" } })
    });

    const response = await createJob(request, { params: Promise.resolve({ id: "proj-1" }) });

    expect(response.status).toBe(200);
    expect(enqueueStudioJob).toHaveBeenCalledWith({
      jobId: "job-1",
      projectId: "proj-1",
      type: "SHORT_SCRIPT",
      input: { prompt: "Test" },
      dedupeKey: "proj-1:SHORT_SCRIPT"
    });
    expect(prismaMock.agentJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inputJson: expect.objectContaining({
          dedupeKey: "proj-1:SHORT_SCRIPT",
          maxAttempts: 5
        })
      })
    });
  });

  it("blocks duplicate in-flight job creation", async () => {
    prismaMock.agentJob.findFirst.mockResolvedValueOnce({
      id: "job-active",
      createdAt: new Date("2026-03-01T00:00:00Z")
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SHORT_SCRIPT", input: { prompt: "Test" } })
    });

    const response = await createJob(request, { params: Promise.resolve({ id: "proj-1" }) });
    expect(response.status).toBe(409);
    expect(enqueueStudioJob).not.toHaveBeenCalled();
  });
});
