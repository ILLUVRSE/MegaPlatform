interface Bucket {
  count: number;
  windowStartMs: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitDecision {
  const safeLimit = Math.max(1, limit);
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStartMs >= windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    return {
      allowed: true,
      remaining: safeLimit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000)
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, safeLimit - existing.count);
  const resetInSeconds = Math.max(0, Math.ceil((windowMs - (now - existing.windowStartMs)) / 1000));
  return {
    allowed: existing.count <= safeLimit,
    remaining,
    resetInSeconds
  };
}

export function clearRateLimitState(): void {
  buckets.clear();
}
