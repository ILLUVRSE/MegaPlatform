export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  factor?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const maxAttempts = Math.max(1, options.attempts);
  const factor = options.factor ?? 2;
  const maxDelay = options.maxDelayMs ?? Number.POSITIVE_INFINITY;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      const delayMs = Math.min(maxDelay, options.baseDelayMs * factor ** (attempt - 1));
      await delay(delayMs);
    }
  }

  throw lastError;
}
