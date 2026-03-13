import path from "path";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { getBillingDunningState, getNextBillingRetry } from "../../../packages/payments/retry-policy.mjs";

export type SubscriptionRecord = {
  id: string;
  userId: string;
  planId: string;
  priceCents: number;
  currency: string;
  cohort: string;
  status: "trialing" | "active" | "past_due" | "cancelled";
  autoConvertOptIn: boolean;
  trialStartedAt: string;
  trialEndsAt: string;
  reminderAt: string;
  reminderSentAt: string | null;
  convertedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  billingRetryCount: number;
  billingRetryScheduledAt: string | null;
  billingFailureStartedAt: string | null;
  billingRecoveredAt: string | null;
  dunningStage: "grace_period" | "soft_dunning" | "hard_dunning" | "write_off" | null;
  lastPaymentAttemptAt: string | null;
  lastPaymentSucceededAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionEvent = {
  id: string;
  subscriptionId: string;
  type:
    | "trial_started"
    | "conversion_reminder_sent"
    | "trial_converted"
    | "trial_cancelled"
    | "billing_failed"
    | "billing_retry_scheduled"
    | "billing_recovered"
    | "billing_write_off";
  createdAt: string;
  metadata?: Record<string, unknown>;
};

type SubscriptionState = {
  subscriptions: Record<string, SubscriptionRecord>;
  events: SubscriptionEvent[];
};

const DEFAULT_STATE: SubscriptionState = {
  subscriptions: {},
  events: []
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function resolveSubscriptionRoot(rootOverride?: string) {
  if (rootOverride) return rootOverride;
  if (process.env.SUBSCRIPTION_DATA_ROOT) return process.env.SUBSCRIPTION_DATA_ROOT;
  const repoRoot = await findRepoRoot();
  return path.join(repoRoot, "artifacts", "subscriptions");
}

async function resolveStatePath(rootOverride?: string) {
  const root = await resolveSubscriptionRoot(rootOverride);
  await fs.mkdir(root, { recursive: true });
  return path.join(root, "ledger.json");
}

async function loadState(rootOverride?: string): Promise<SubscriptionState> {
  const file = await resolveStatePath(rootOverride);
  if (!(await exists(file))) {
    await fs.writeFile(file, JSON.stringify(DEFAULT_STATE, null, 2));
    return structuredClone(DEFAULT_STATE);
  }

  const raw = await fs.readFile(file, "utf-8");
  const parsed = JSON.parse(raw) as Partial<SubscriptionState>;
  return {
    subscriptions: parsed.subscriptions ?? {},
    events: parsed.events ?? []
  };
}

async function withState<T>(mutator: (state: SubscriptionState) => Promise<T> | T, rootOverride?: string) {
  const file = await resolveStatePath(rootOverride);
  const state = await loadState(rootOverride);
  const draft = structuredClone(state);
  const result = await mutator(draft);
  await fs.writeFile(file, JSON.stringify(draft, null, 2));
  return result;
}

function deriveCohort(date: string) {
  return date.slice(0, 7);
}

function addDays(input: string, days: number) {
  return new Date(Date.parse(input) + days * 24 * 60 * 60 * 1000).toISOString();
}

function pushEvent(state: SubscriptionState, event: Omit<SubscriptionEvent, "id">) {
  state.events.push({
    id: `subevt_${randomUUID()}`,
    ...event
  });
}

export async function startTrial(
  input: {
    userId: string;
    planId?: string;
    priceCents?: number;
    currency?: string;
    trialDays?: number;
    autoConvertOptIn?: boolean;
    now?: string;
  },
  rootOverride?: string
) {
  const now = input.now ?? new Date().toISOString();
  const trialDays = Math.max(1, input.trialDays ?? 14);
  return withState((state) => {
    const existing = Object.values(state.subscriptions).find(
      (subscription) => subscription.userId === input.userId && subscription.planId === (input.planId ?? "premium") && subscription.status !== "cancelled"
    );
    if (existing) return existing;

    const subscription: SubscriptionRecord = {
      id: `sub_${randomUUID()}`,
      userId: input.userId,
      planId: input.planId ?? "premium",
      priceCents: input.priceCents ?? 999,
      currency: input.currency ?? "USD",
      cohort: deriveCohort(now),
      status: "trialing",
      autoConvertOptIn: input.autoConvertOptIn ?? true,
      trialStartedAt: now,
      trialEndsAt: addDays(now, trialDays),
      reminderAt: addDays(now, Math.max(1, trialDays - 3)),
      reminderSentAt: null,
      convertedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      billingRetryCount: 0,
      billingRetryScheduledAt: null,
      billingFailureStartedAt: null,
      billingRecoveredAt: null,
      dunningStage: null,
      lastPaymentAttemptAt: null,
      lastPaymentSucceededAt: null,
      createdAt: now,
      updatedAt: now
    };
    state.subscriptions[subscription.id] = subscription;
    pushEvent(state, {
      subscriptionId: subscription.id,
      type: "trial_started",
      createdAt: now,
      metadata: { cohort: subscription.cohort, autoConvertOptIn: subscription.autoConvertOptIn }
    });
    return subscription;
  }, rootOverride);
}

export async function sendTrialConversionReminder(
  subscriptionId: string,
  input: { now?: string } = {},
  rootOverride?: string
) {
  const now = input.now ?? new Date().toISOString();
  return withState((state) => {
    const subscription = state.subscriptions[subscriptionId];
    if (!subscription) throw new Error("subscription_not_found");
    if (subscription.status !== "trialing") return subscription;
    if (subscription.reminderSentAt) return subscription;
    if (Date.parse(now) < Date.parse(subscription.reminderAt)) return subscription;
    subscription.reminderSentAt = now;
    subscription.updatedAt = now;
    pushEvent(state, {
      subscriptionId,
      type: "conversion_reminder_sent",
      createdAt: now
    });
    return subscription;
  }, rootOverride);
}

function markBillingFailure(state: SubscriptionState, subscription: SubscriptionRecord, now: string, reason: string) {
  subscription.status = "past_due";
  subscription.billingFailureStartedAt ??= now;
  subscription.lastPaymentAttemptAt = now;
  const nextRetry = getNextBillingRetry({
    attemptCount: subscription.billingRetryCount,
    lastAttemptAt: now
  });
  const dunning = getBillingDunningState({
    attemptCount: subscription.billingRetryCount,
    firstFailedAt: subscription.billingFailureStartedAt,
    now
  });
  subscription.billingRetryScheduledAt = nextRetry?.retryAt ?? null;
  subscription.dunningStage = dunning.stage;
  subscription.updatedAt = now;
  pushEvent(state, {
    subscriptionId: subscription.id,
    type: "billing_failed",
    createdAt: now,
    metadata: { reason, attemptCount: subscription.billingRetryCount, dunningStage: dunning.stage }
  });
  if (nextRetry) {
    pushEvent(state, {
      subscriptionId: subscription.id,
      type: "billing_retry_scheduled",
      createdAt: now,
      metadata: { retryAt: nextRetry.retryAt, attemptNumber: nextRetry.attemptNumber }
    });
  }
}

export async function convertTrial(
  subscriptionId: string,
  input: { now?: string; paymentBehavior?: "success" | "fail" } = {},
  rootOverride?: string
) {
  const now = input.now ?? new Date().toISOString();
  return withState((state) => {
    const subscription = state.subscriptions[subscriptionId];
    if (!subscription) throw new Error("subscription_not_found");
    if (subscription.status === "cancelled") return subscription;
    if (!subscription.autoConvertOptIn && input.paymentBehavior !== "success") return subscription;

    if (input.paymentBehavior === "fail") {
      markBillingFailure(state, subscription, now, "conversion_charge_failed");
      return subscription;
    }

    subscription.status = "active";
    subscription.convertedAt ??= now;
    subscription.lastPaymentAttemptAt = now;
    subscription.lastPaymentSucceededAt = now;
    subscription.billingRetryScheduledAt = null;
    subscription.billingFailureStartedAt = null;
    subscription.billingRecoveredAt = subscription.convertedAt === now ? null : now;
    subscription.dunningStage = null;
    subscription.updatedAt = now;
    pushEvent(state, {
      subscriptionId,
      type: "trial_converted",
      createdAt: now,
      metadata: { priceCents: subscription.priceCents }
    });
    return subscription;
  }, rootOverride);
}

export async function cancelSubscription(
  subscriptionId: string,
  input: { now?: string; reason?: string } = {},
  rootOverride?: string
) {
  const now = input.now ?? new Date().toISOString();
  return withState((state) => {
    const subscription = state.subscriptions[subscriptionId];
    if (!subscription) throw new Error("subscription_not_found");
    if (subscription.status === "cancelled") return subscription;
    subscription.status = "cancelled";
    subscription.cancelledAt = now;
    subscription.cancellationReason = input.reason ?? "user_cancelled";
    subscription.billingRetryScheduledAt = null;
    subscription.updatedAt = now;
    pushEvent(state, {
      subscriptionId,
      type: "trial_cancelled",
      createdAt: now,
      metadata: { reason: subscription.cancellationReason }
    });
    return subscription;
  }, rootOverride);
}

export async function processBillingRetries(
  input: { now?: string; failSubscriptionIds?: string[] } = {},
  rootOverride?: string
) {
  const now = input.now ?? new Date().toISOString();
  const failSubscriptionIds = new Set(input.failSubscriptionIds ?? []);
  return withState((state) => {
    const results: Array<{ subscriptionId: string; status: "recovered" | "retry_scheduled" | "cancelled"; retryCount: number }> = [];
    for (const subscription of Object.values(state.subscriptions)) {
      if (subscription.status !== "past_due" || !subscription.billingRetryScheduledAt) continue;
      if (Date.parse(subscription.billingRetryScheduledAt) > Date.parse(now)) continue;

      subscription.billingRetryCount += 1;
      subscription.lastPaymentAttemptAt = now;

      if (!failSubscriptionIds.has(subscription.id)) {
        subscription.status = "active";
        subscription.convertedAt ??= now;
        subscription.lastPaymentSucceededAt = now;
        subscription.billingRetryScheduledAt = null;
        subscription.billingRecoveredAt = now;
        subscription.billingFailureStartedAt = null;
        subscription.dunningStage = null;
        subscription.updatedAt = now;
        pushEvent(state, {
          subscriptionId: subscription.id,
          type: "billing_recovered",
          createdAt: now,
          metadata: { retryCount: subscription.billingRetryCount }
        });
        results.push({ subscriptionId: subscription.id, status: "recovered", retryCount: subscription.billingRetryCount });
        continue;
      }

      const nextRetry = getNextBillingRetry({
        attemptCount: subscription.billingRetryCount,
        lastAttemptAt: now
      });
      const dunning = getBillingDunningState({
        attemptCount: subscription.billingRetryCount,
        firstFailedAt: subscription.billingFailureStartedAt ?? now,
        now
      });
      subscription.dunningStage = dunning.stage;
      subscription.updatedAt = now;

      if (!nextRetry || dunning.shouldWriteOff) {
        subscription.status = "cancelled";
        subscription.cancelledAt = now;
        subscription.cancellationReason = "billing_dunning_exhausted";
        subscription.billingRetryScheduledAt = null;
        pushEvent(state, {
          subscriptionId: subscription.id,
          type: "billing_write_off",
          createdAt: now,
          metadata: { retryCount: subscription.billingRetryCount, dunningStage: dunning.stage }
        });
        results.push({ subscriptionId: subscription.id, status: "cancelled", retryCount: subscription.billingRetryCount });
        continue;
      }

      subscription.billingRetryScheduledAt = nextRetry.retryAt;
      pushEvent(state, {
        subscriptionId: subscription.id,
        type: "billing_retry_scheduled",
        createdAt: now,
        metadata: { retryAt: nextRetry.retryAt, attemptNumber: nextRetry.attemptNumber, dunningStage: dunning.stage }
      });
      results.push({ subscriptionId: subscription.id, status: "retry_scheduled", retryCount: subscription.billingRetryCount });
    }
    return results;
  }, rootOverride);
}

export async function loadSubscriptionState(rootOverride?: string) {
  return loadState(rootOverride);
}

export async function buildSubscriptionAnalytics(rootOverride?: string) {
  const state = await loadState(rootOverride);
  const subscriptions = Object.values(state.subscriptions).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const cohorts = new Map<
    string,
    {
      cohort: string;
      trialStarts: number;
      reminderSent: number;
      paidConversions: number;
      activePaid: number;
      cancelled: number;
      pastDue: number;
      recovered: number;
    }
  >();

  for (const subscription of subscriptions) {
    const bucket =
      cohorts.get(subscription.cohort) ??
      {
        cohort: subscription.cohort,
        trialStarts: 0,
        reminderSent: 0,
        paidConversions: 0,
        activePaid: 0,
        cancelled: 0,
        pastDue: 0,
        recovered: 0
      };
    bucket.trialStarts += 1;
    if (subscription.reminderSentAt) bucket.reminderSent += 1;
    if (subscription.convertedAt) bucket.paidConversions += 1;
    if (subscription.status === "active") bucket.activePaid += 1;
    if (subscription.status === "cancelled") bucket.cancelled += 1;
    if (subscription.status === "past_due") bucket.pastDue += 1;
    if (subscription.billingRecoveredAt) bucket.recovered += 1;
    cohorts.set(subscription.cohort, bucket);
  }

  const cohortMetrics = Array.from(cohorts.values())
    .sort((left, right) => right.cohort.localeCompare(left.cohort))
    .map((bucket) => ({
      ...bucket,
      conversionRate: bucket.trialStarts === 0 ? 0 : Number((bucket.paidConversions / bucket.trialStarts).toFixed(2))
    }));

  return {
    overview: {
      totalTrials: subscriptions.length,
      activePaid: subscriptions.filter((subscription) => subscription.status === "active").length,
      pastDue: subscriptions.filter((subscription) => subscription.status === "past_due").length,
      cancelled: subscriptions.filter((subscription) => subscription.status === "cancelled").length,
      converted: subscriptions.filter((subscription) => subscription.convertedAt).length
    },
    cohorts: cohortMetrics,
    subscriptions: subscriptions.slice(0, 50),
    events: state.events.slice(-100).reverse()
  };
}
