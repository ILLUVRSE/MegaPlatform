/**
 * Agent manager queue helpers.
 * Request/response: enqueue studio jobs on Redis-backed queue.
 * Guard: server-side only; requires REDIS_URL.
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
  buildStudioDedupeKey,
  calculateStudioRetryDelayMs,
  STUDIO_JOB_ATTEMPTS,
  STUDIO_KEEP_COMPLETED_JOBS,
  STUDIO_KEEP_FAILED_JOBS,
  STUDIO_QUEUE_NAME,
  STUDIO_RETRY_BASE_DELAY_MS,
  type StudioJobPayload
} from "./studioQueue";
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
export {
  newRunId,
  appendAgentMemory,
  listAgentMemory,
  getAgentDailyUsage,
  type AgentMemoryRecord
} from "./ops/memory";
export { replayAgentRun, replayAgentInteractions } from "./ops/replay";
export { assertAgentBudget, type AgentBudgetResult } from "./ops/controlPlane";
export {
  buildStudioDedupeKey,
  calculateStudioRetryDelayMs,
  STUDIO_JOB_ATTEMPTS,
  STUDIO_KEEP_COMPLETED_JOBS,
  STUDIO_KEEP_FAILED_JOBS,
  STUDIO_QUEUE_NAME,
  STUDIO_RETRY_BASE_DELAY_MS
} from "./studioQueue";
export { generateThumbnail } from "./render";

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
        type: "studio-jitter",
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
  dedupeKey?: string;
}) {
  const queue = getStudioQueue();
  const queuePayload: StudioJobPayload = {
    ...payload,
    dedupeKey: payload.dedupeKey ?? buildStudioDedupeKey(payload.projectId, payload.type)
  };
  const job = await queue.add(payload.type, queuePayload, {
    jobId: payload.jobId,
    attempts: Math.max(1, STUDIO_JOB_ATTEMPTS),
    backoff: {
      type: "studio-jitter",
      delay: Math.max(250, STUDIO_RETRY_BASE_DELAY_MS)
    }
  });

  return job.id;
}
