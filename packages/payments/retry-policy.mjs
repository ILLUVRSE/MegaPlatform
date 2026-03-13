const DEFAULT_POLICY = Object.freeze({
  baseDelayMs: 60 * 60 * 1000,
  maxDelayMs: 5 * 24 * 60 * 60 * 1000,
  maxAttempts: 5,
  writeOffAfterDays: 14
});

export function getBillingRetryPolicy(overrides = {}) {
  return {
    ...DEFAULT_POLICY,
    ...overrides
  };
}

export function getBillingRetryDelayMs(attemptCount, overrides = {}) {
  const policy = getBillingRetryPolicy(overrides);
  const safeAttemptCount = Math.max(0, Number.isFinite(attemptCount) ? Math.trunc(attemptCount) : 0);
  return Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** safeAttemptCount);
}

export function getNextBillingRetry(input = {}) {
  const {
    attemptCount = 0,
    lastAttemptAt,
    now = new Date().toISOString()
  } = input;
  const policy = getBillingRetryPolicy(input.policy);
  const safeAttemptCount = Math.max(0, Number.isFinite(attemptCount) ? Math.trunc(attemptCount) : 0);
  if (safeAttemptCount >= policy.maxAttempts) {
    return null;
  }

  const anchor = Date.parse(lastAttemptAt ?? now);
  const delayMs = getBillingRetryDelayMs(safeAttemptCount, policy);
  return {
    retryAt: new Date(anchor + delayMs).toISOString(),
    attemptNumber: safeAttemptCount + 1,
    delayMs
  };
}

export function getBillingDunningState(input = {}) {
  const {
    attemptCount = 0,
    firstFailedAt,
    now = new Date().toISOString()
  } = input;
  const policy = getBillingRetryPolicy(input.policy);
  const safeAttemptCount = Math.max(0, Number.isFinite(attemptCount) ? Math.trunc(attemptCount) : 0);
  const anchor = Date.parse(firstFailedAt ?? now);
  const elapsedDays = Math.max(0, Math.floor((Date.parse(now) - anchor) / (24 * 60 * 60 * 1000)));

  if (safeAttemptCount <= 0) {
    return { stage: "grace_period", shouldWriteOff: false, elapsedDays };
  }
  if (safeAttemptCount < policy.maxAttempts - 1) {
    return { stage: "soft_dunning", shouldWriteOff: false, elapsedDays };
  }
  if (safeAttemptCount < policy.maxAttempts || elapsedDays < policy.writeOffAfterDays) {
    return { stage: "hard_dunning", shouldWriteOff: false, elapsedDays };
  }
  return { stage: "write_off", shouldWriteOff: true, elapsedDays };
}
