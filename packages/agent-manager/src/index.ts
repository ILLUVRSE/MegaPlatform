/**
 * Agent manager queue helpers.
 * Request/response: enqueue studio jobs on Redis-backed queue.
 * Guard: server-side only; requires REDIS_URL.
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";
export {
  OPS_AGENTS,
  TASK_STATUSES,
  type OpsAgent,
  type TaskRecord,
  type TaskStatus,
  type CreateTaskInput,
  createTask,
  readTask,
  listTasks,
  claimTask,
  completeTask,
  blockTask,
  appendTaskStep,
  pickNextTaskForAgent
} from "./ops/taskQueue";
export { runDirectorCycle } from "./ops/director";
export { runSpecialist } from "./ops/specialist";

export const STUDIO_QUEUE_NAME = "studio-jobs";
export const STUDIO_JOB_ATTEMPTS = Number(process.env.STUDIO_JOB_ATTEMPTS ?? "5");
export const STUDIO_RETRY_BASE_DELAY_MS = Number(process.env.STUDIO_RETRY_BASE_DELAY_MS ?? "2000");
export const STUDIO_KEEP_COMPLETED_JOBS = Number(process.env.STUDIO_KEEP_COMPLETED_JOBS ?? "500");
export const STUDIO_KEEP_FAILED_JOBS = Number(process.env.STUDIO_KEEP_FAILED_JOBS ?? "2000");

let queueInstance: Queue | null = null;

function isTestEnv() {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export function getStudioQueue() {
  if (queueInstance) return queueInstance;
  if (isTestEnv()) {
    queueInstance = {
      add: async () => ({ id: "test-job" })
    } as unknown as Queue;
    return queueInstance;
  }
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null
  });
  queueInstance = new Queue(STUDIO_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: Math.max(1, STUDIO_JOB_ATTEMPTS),
      backoff: {
        type: "exponential",
        delay: Math.max(250, STUDIO_RETRY_BASE_DELAY_MS)
      },
      removeOnComplete: {
        count: Math.max(50, STUDIO_KEEP_COMPLETED_JOBS)
      },
      removeOnFail: {
        count: Math.max(100, STUDIO_KEEP_FAILED_JOBS)
      }
    }
  });
  return queueInstance;
}

export async function enqueueStudioJob(payload: {
  jobId: string;
  projectId: string;
  type: string;
  input: Record<string, unknown>;
}) {
  const queue = getStudioQueue();
  const job = await queue.add(payload.type, payload, {
    jobId: payload.jobId,
    attempts: Math.max(1, STUDIO_JOB_ATTEMPTS),
    backoff: {
      type: "exponential",
      delay: Math.max(250, STUDIO_RETRY_BASE_DELAY_MS)
    }
  });

  return job.id;
}
