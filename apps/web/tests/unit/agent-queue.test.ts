/**
 * Unit tests for agent-manager queue helpers.
 * Request/response: validates enqueue wiring to BullMQ.
 * Guard: mocks BullMQ Queue.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({}))
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "queue-1" })
  }))
}));

import { enqueueStudioJob, getStudioQueue } from "@illuvrse/agent-manager";

describe("agent queue helpers", () => {
  it("adds a job to BullMQ", async () => {
    const jobId = await enqueueStudioJob({
      jobId: "job-1",
      projectId: "proj-1",
      type: "SHORT_SCRIPT",
      input: { prompt: "Test" }
    });

    expect(getStudioQueue().add).toBeDefined();
    expect(jobId).toBe("test-job");
  });
});
