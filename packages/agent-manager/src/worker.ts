/**
 * Studio jobs worker.
 * Request/response: consumes Redis queue and writes DB + assets.
 * Guard: requires REDIS_URL, DATABASE_URL, and S3 env vars.
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  calculateStudioRetryDelayMs,
  getStudioQueue,
  STUDIO_QUEUE_NAME
} from "./index";
import { logStudioWorker, processStudioJob } from "./studioWorkerRuntime";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

export const studioWorker = new Worker(
  STUDIO_QUEUE_NAME,
  async (job) => processStudioJob(job),
  {
    connection,
    concurrency: Math.max(1, Number(process.env.STUDIO_WORKER_CONCURRENCY ?? "2")),
    lockDuration: Math.max(30_000, Number(process.env.STUDIO_WORKER_LOCK_MS ?? "120000")),
    maxStalledCount: Math.max(1, Number(process.env.STUDIO_WORKER_MAX_STALLED ?? "2")),
    settings: {
      backoffStrategy: (attemptsMade, type, _err, job) => {
        if (type !== "studio-jitter") {
          return 0;
        }
        return calculateStudioRetryDelayMs({
          attempt: Math.max(1, attemptsMade),
          jobId: job?.id?.toString()
        });
      }
    }
  }
);

studioWorker.on("failed", (job, err) => {
  logStudioWorker("Worker job failed", { jobId: job?.id, error: err.message });
});

setInterval(async () => {
  try {
    const queue = getStudioQueue();
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    logStudioWorker("Queue heartbeat", { counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown queue heartbeat error";
    logStudioWorker("Queue heartbeat failed", { error: message });
  }
}, 60_000);
