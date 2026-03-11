/**
 * Simple job polling helper.
 * Request/response: polls job endpoint until completion.
 * Guard: client-side usage only.
 */
import { getJob, type AgentJob } from "./studioApi";

type PollOptions = {
  intervalMs?: number;
  maxIntervalMs?: number;
  timeoutMs?: number;
};

export async function pollJob(jobId: string, onUpdate: (job: AgentJob) => void, options?: PollOptions) {
  const baseIntervalMs = options?.intervalMs ?? 400;
  const maxIntervalMs = options?.maxIntervalMs ?? 2_000;
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const startMs = Date.now();
  let intervalMs = baseIntervalMs;
  let current = await getJob(jobId);
  onUpdate(current.job);

  while (current.job.status === "QUEUED" || current.job.status === "PROCESSING") {
    if (Date.now() - startMs > timeoutMs) {
      throw new Error("Job timed out while polling");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    intervalMs = Math.min(maxIntervalMs, Math.round(intervalMs * 1.5));
    current = await getJob(jobId);
    onUpdate(current.job);
  }

  if (current.job.status === "FAILED") {
    throw new Error(current.job.error ?? "Job failed");
  }

  return current.job;
}
