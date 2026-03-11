export interface DeadLetterPayload {
  workerName: string;
  jobId: string | null;
  queueName: string | null;
  failedAt: string;
  errorMessage: string;
  stack: string | null;
  data: unknown;
}

export function buildDeadLetterPayload(input: {
  workerName: string;
  jobId?: string | number | null;
  queueName?: string | null;
  error: Error;
  data: unknown;
  now?: Date;
}): DeadLetterPayload {
  return {
    workerName: input.workerName,
    jobId: input.jobId === undefined || input.jobId === null ? null : String(input.jobId),
    queueName: input.queueName ?? null,
    failedAt: (input.now ?? new Date()).toISOString(),
    errorMessage: input.error.message,
    stack: input.error.stack ?? null,
    data: input.data
  };
}
