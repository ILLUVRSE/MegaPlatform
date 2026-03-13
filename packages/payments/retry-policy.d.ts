export type BillingRetryPolicy = {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
  writeOffAfterDays: number;
};

export type BillingRetryInput = {
  attemptCount?: number;
  lastAttemptAt?: string;
  now?: string;
  policy?: Partial<BillingRetryPolicy>;
};

export type BillingDunningInput = {
  attemptCount?: number;
  firstFailedAt?: string;
  now?: string;
  policy?: Partial<BillingRetryPolicy>;
};

export function getBillingRetryPolicy(overrides?: Partial<BillingRetryPolicy>): BillingRetryPolicy;
export function getBillingRetryDelayMs(attemptCount: number, overrides?: Partial<BillingRetryPolicy>): number;
export function getNextBillingRetry(input?: BillingRetryInput): { retryAt: string; attemptNumber: number; delayMs: number } | null;
export function getBillingDunningState(input?: BillingDunningInput): {
  stage: "grace_period" | "soft_dunning" | "hard_dunning" | "write_off";
  shouldWriteOff: boolean;
  elapsedDays: number;
};
