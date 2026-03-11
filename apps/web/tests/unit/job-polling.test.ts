import { describe, expect, it, vi } from "vitest";

const getJobMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/studioApi", () => ({
  getJob: getJobMock
}));

import { pollJob } from "@/lib/jobPolling";

describe("job polling", () => {
  it("resolves when job reaches completed", async () => {
    getJobMock
      .mockResolvedValueOnce({ job: { id: "job-1", status: "QUEUED", type: "SHORT_SCRIPT", inputJson: {} } })
      .mockResolvedValueOnce({ job: { id: "job-1", status: "PROCESSING", type: "SHORT_SCRIPT", inputJson: {} } })
      .mockResolvedValueOnce({
        job: { id: "job-1", status: "COMPLETED", type: "SHORT_SCRIPT", inputJson: {}, outputJson: { ok: true } }
      });

    const updates: string[] = [];
    const job = await pollJob("job-1", (next) => updates.push(next.status), {
      intervalMs: 1,
      maxIntervalMs: 1,
      timeoutMs: 500
    });

    expect(job.status).toBe("COMPLETED");
    expect(updates).toEqual(["QUEUED", "PROCESSING", "COMPLETED"]);
  });

  it("throws when job fails", async () => {
    getJobMock
      .mockResolvedValueOnce({ job: { id: "job-2", status: "PROCESSING", type: "SHORT_SCRIPT", inputJson: {} } })
      .mockResolvedValueOnce({
        job: { id: "job-2", status: "FAILED", type: "SHORT_SCRIPT", inputJson: {}, error: "boom" }
      });

    await expect(
      pollJob("job-2", () => {}, {
        intervalMs: 1,
        maxIntervalMs: 1,
        timeoutMs: 500
      })
    ).rejects.toThrow("boom");
  });
});
