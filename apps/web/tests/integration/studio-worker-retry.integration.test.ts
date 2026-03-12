import { describe, expect, it, vi } from "vitest";
import { processStudioJob } from "../../../../packages/agent-manager/src/studioWorkerRuntime";

function createIntegrationDeps() {
  const jobs = new Map<string, Record<string, unknown>>([
    [
      "job-1",
      {
        id: "job-1",
        status: "QUEUED",
        outputJson: null
      }
    ]
  ]);
  const assets = new Map<string, Record<string, unknown>>();

  const prisma = {
    agentJob: {
      update: vi.fn(async ({ where, data }) => {
        const current = jobs.get(where.id) ?? { id: where.id };
        const next = { ...current, ...data };
        jobs.set(where.id, next);
        return next;
      }),
      findUnique: vi.fn(async ({ where }) => jobs.get(where.id) ?? null),
      create: vi.fn(async ({ data }) => ({ id: "job-followup", ...data })),
      count: vi.fn(async ({ where }) => {
        if (where?.status?.in) return 0;
        if (where?.status === "FAILED") return 0;
        return 0;
      })
    },
    studioProject: {
      update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data }))
    },
    studioAsset: {
      findFirst: vi.fn(async ({ where }) => assets.get(`${where.projectId}:${where.storageKey}:${where.kind}`) ?? null),
      create: vi.fn(async ({ data }) => {
        const key = `${data.projectId}:${data.storageKey}:${data.kind}`;
        const created = { id: `asset-${assets.size + 1}`, ...data };
        assets.set(key, created);
        return created;
      }),
      update: vi.fn(async ({ where, data }) => {
        let existingKey: string | null = null;
        for (const [key, asset] of assets.entries()) {
          if (asset.id === where.id) {
            existingKey = key;
            break;
          }
        }
        const existing = Array.from(assets.values()).find((asset) => asset.id === where.id) ?? {
          id: where.id
        };
        const key = `${existing.projectId ?? "project-1"}:${data.storageKey ?? existing.storageKey}:${data.kind ?? existing.kind}`;
        const updated = { ...existing, ...data };
        if (existingKey && existingKey !== key) {
          assets.delete(existingKey);
        }
        assets.set(key, updated);
        return updated;
      })
    },
    shortPost: {
      updateMany: vi.fn(async () => ({ count: 0 }))
    }
  };

  let transientFailure = true;

  return {
    deps: {
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
      generateShortSlideshowMp4: vi.fn(async () => {
        if (transientFailure) {
          transientFailure = false;
          throw new Error("temporary renderer failure");
        }
        return "/tmp/render.mp4";
      }),
      transcodeToHls: vi.fn(async () => ({ manifest: "/tmp/master.m3u8", dir: "/tmp/hls" })),
      generateThumbnail: vi.fn(async () => "/tmp/thumb.jpg"),
      generateMemePng: vi.fn(async () => Buffer.from("png")),
      extractClip: vi.fn(async () => "/tmp/clip.mp4"),
      enqueueStudioJob: vi.fn(async () => "followup-queue-id"),
      now: vi.fn()
    },
    jobs,
    assets
  };
}

describe("studio worker integration", () => {
  it("retries transient failures and keeps asset writes idempotent", async () => {
    const { deps, jobs, assets } = createIntegrationDeps();
    deps.now
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_400)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_200);

    const payload = {
      id: "bull-job-1",
      data: {
        jobId: "job-1",
        projectId: "project-1",
        type: "SHORT_RENDER",
        input: {}
      },
      attemptsMade: 0,
      opts: { attempts: 2 }
    };

    await expect(processStudioJob(payload, deps as never, vi.fn())).rejects.toThrow("temporary renderer failure");
    expect((jobs.get("job-1")?.outputJson as Record<string, unknown>).retryable).toBe(true);
    expect(assets.size).toBe(0);

    await processStudioJob({ ...payload, attemptsMade: 1 }, deps as never, vi.fn());

    expect(jobs.get("job-1")?.status).toBe("COMPLETED");
    expect((jobs.get("job-1")?.outputJson as Record<string, unknown>).attempts).toBe(2);
    expect((jobs.get("job-1")?.outputJson as Record<string, unknown>).retryable).toBe(false);
    expect(assets.size).toBe(1);

    await processStudioJob({ ...payload, attemptsMade: 1 }, deps as never, vi.fn());

    expect(assets.size).toBe(1);
    const asset = Array.from(assets.values())[0];
    expect((asset.metaJson as Record<string, unknown>).jobType).toBe("SHORT_RENDER");
    expect(asset.kind).toBe("SHORT_MP4");
  });
});
