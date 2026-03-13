import { describe, expect, it, vi } from "vitest";
import { calculateStudioRetryDelayMs } from "../../../../packages/agent-manager/src/studioQueue";
import { processStudioJob } from "../../../../packages/agent-manager/src/studioWorkerRuntime";

function createDeps() {
  const state = {
    assets: [] as Array<Record<string, unknown>>,
    jobs: new Map<string, Record<string, unknown>>([
      [
        "job-1",
        {
          id: "job-1",
          status: "QUEUED",
          outputJson: null
        }
      ]
    ])
  };

  const prisma = {
    agentJob: {
      update: vi.fn(async ({ where, data }) => {
        const current = state.jobs.get(where.id) ?? { id: where.id };
        const next = { ...current, ...data };
        state.jobs.set(where.id, next);
        return next;
      }),
      findUnique: vi.fn(async ({ where }) => state.jobs.get(where.id) ?? null),
      create: vi.fn(async ({ data }) => {
        const created = { id: `followup-${state.jobs.size + 1}`, ...data };
        state.jobs.set(created.id, created);
        return created;
      }),
      count: vi.fn(async () => 0)
    },
    studioProject: {
      update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data }))
    },
    studioAsset: {
      findFirst: vi.fn(async ({ where }) => {
        return (
          state.assets.find(
            (asset) =>
              asset.projectId === where.projectId &&
              asset.storageKey === where.storageKey &&
              asset.kind === where.kind
          ) ?? null
        );
      }),
      create: vi.fn(async ({ data }) => {
        const created = { id: `asset-${state.assets.length + 1}`, ...data };
        state.assets.push(created);
        return created;
      }),
      update: vi.fn(async ({ where, data }) => {
        const index = state.assets.findIndex((asset) => asset.id === where.id);
        const updated = { ...(state.assets[index] ?? { id: where.id }), ...data };
        state.assets[index] = updated;
        return updated;
      })
    },
    shortPost: {
      updateMany: vi.fn(async () => ({ count: 0 }))
    }
  };

  const deps = {
    prisma: prisma as never,
    uploadBuffer: vi.fn(async (key: string) => `https://cdn.example/${key}`),
    access: vi.fn(),
    readFile: vi.fn(async () => Buffer.from("file")),
    readdir: vi.fn(async () => ["frame-1.png"]),
    writeFile: vi.fn(async () => undefined),
    tmpdir: () => "/tmp",
    join: (...parts: string[]) => parts.join("/"),
    fetch: vi.fn(async () => new Response(Buffer.from("asset"))),
    loadBrollImages: vi.fn(async () => ["/tmp/frame-1.png"]),
    generateShortSlideshowMp4: vi.fn(async () => "/tmp/render.mp4"),
    transcodeToHls: vi.fn(async () => ({ manifest: "/tmp/master.m3u8", dir: "/tmp/hls" })),
    generateThumbnail: vi.fn(async () => "/tmp/thumb.jpg"),
    generateMemePng: vi.fn(async () => Buffer.from("png")),
    extractClip: vi.fn(async () => "/tmp/clip.mp4"),
    enqueueStudioJob: vi.fn(async () => "followup-queue-id"),
    now: vi.fn()
  };

  return { deps, state, prisma };
}

describe("studio worker retry hardening", () => {
  it("calculates deterministic exponential backoff with jitter", () => {
    const first = calculateStudioRetryDelayMs({ attempt: 2, jobId: "job-1", baseDelayMs: 1000, jitter: 0.35 });
    const second = calculateStudioRetryDelayMs({ attempt: 2, jobId: "job-1", baseDelayMs: 1000, jitter: 0.35 });
    const laterAttempt = calculateStudioRetryDelayMs({ attempt: 3, jobId: "job-1", baseDelayMs: 1000, jitter: 0.35 });

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(1300);
    expect(first).toBeLessThanOrEqual(2000);
    expect(laterAttempt).toBeGreaterThan(first);
  });

  it("persists retry metadata on transient failure", async () => {
    const { deps, state } = createDeps();
    deps.now.mockReturnValueOnce(1_000).mockReturnValueOnce(1_500);
    deps.loadBrollImages.mockRejectedValueOnce(new Error("temporary ffmpeg outage"));

    await expect(
      processStudioJob(
        {
          id: "bull-job-1",
          data: {
            jobId: "job-1",
            projectId: "project-1",
            type: "SHORT_RENDER",
            input: {}
          },
          attemptsMade: 0,
          opts: { attempts: 3 }
        },
        deps as never,
        vi.fn()
      )
    ).rejects.toThrow("temporary ffmpeg outage");

    const storedJob = state.jobs.get("job-1");
    expect(storedJob?.status).toBe("QUEUED");
    expect((storedJob?.outputJson as Record<string, unknown>).attempts).toBe(1);
    expect((storedJob?.outputJson as Record<string, unknown>).maxAttempts).toBe(3);
    expect((storedJob?.outputJson as Record<string, unknown>).retryable).toBe(true);
    expect((storedJob?.outputJson as Record<string, unknown>).lastError).toBe("temporary ffmpeg outage");
    expect((storedJob?.outputJson as Record<string, unknown>).nextRetryAt).toBeTruthy();
  });
});
