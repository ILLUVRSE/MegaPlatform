export const STUDIO_QUEUE_NAME = "studio-jobs";
export const STUDIO_JOB_ATTEMPTS = Number(process.env.STUDIO_JOB_ATTEMPTS ?? "5");
export const STUDIO_RETRY_BASE_DELAY_MS = Number(process.env.STUDIO_RETRY_BASE_DELAY_MS ?? "2000");
export const STUDIO_RETRY_MAX_DELAY_MS = Number(process.env.STUDIO_RETRY_MAX_DELAY_MS ?? "30000");
export const STUDIO_RETRY_JITTER = Number(process.env.STUDIO_RETRY_JITTER ?? "0.35");
export const STUDIO_KEEP_COMPLETED_JOBS = Number(process.env.STUDIO_KEEP_COMPLETED_JOBS ?? "500");
export const STUDIO_KEEP_FAILED_JOBS = Number(process.env.STUDIO_KEEP_FAILED_JOBS ?? "2000");

export type StudioJobPayload = {
  jobId: string;
  projectId: string;
  type: string;
  input: Record<string, unknown>;
  dedupeKey?: string;
};

function clampJitter(value: number) {
  if (!Number.isFinite(value)) return 0.35;
  return Math.min(0.9, Math.max(0, value));
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function buildStudioDedupeKey(projectId: string, type: string) {
  return `${projectId}:${type}`;
}

export function calculateStudioRetryDelayMs(input: {
  attempt: number;
  jobId?: string | null;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: number;
}) {
  const baseDelayMs = Math.max(250, input.baseDelayMs ?? STUDIO_RETRY_BASE_DELAY_MS);
  const maxDelayMs = Math.max(baseDelayMs, input.maxDelayMs ?? STUDIO_RETRY_MAX_DELAY_MS);
  const jitter = clampJitter(input.jitter ?? STUDIO_RETRY_JITTER);
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, input.attempt - 1)));
  const fingerprint = `${input.jobId ?? "studio"}:${input.attempt}`;
  const normalizedHash = hashString(fingerprint) / 0xffffffff;
  const multiplier = 1 - normalizedHash * jitter;

  return Math.max(250, Math.round(exponentialDelay * multiplier));
}
