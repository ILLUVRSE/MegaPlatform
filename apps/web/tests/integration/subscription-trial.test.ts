import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { GET, POST } from "@/app/api/subscription/subscribe/route";

describe("subscription trials integration", () => {
  let root = "";
  const originalRoot = process.env.SUBSCRIPTION_DATA_ROOT;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "illuvrse-subscriptions-"));
    process.env.SUBSCRIPTION_DATA_ROOT = root;
  });

  afterEach(async () => {
    process.env.SUBSCRIPTION_DATA_ROOT = originalRoot;
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("runs a trial from start through reminder and paid conversion", async () => {
    const start = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "start_trial",
          userId: "user-trial-1",
          planId: "premium-monthly",
          priceCents: 1299,
          trialDays: 7,
          autoConvertOptIn: true,
          now: "2026-03-01T12:00:00.000Z"
        })
      })
    );
    const startBody = await start.json();
    expect(start.status).toBe(201);
    expect(startBody.subscription.status).toBe("trialing");

    const reminder = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "send_reminder",
          subscriptionId: startBody.subscription.id,
          now: "2026-03-05T12:00:00.000Z"
        })
      })
    );
    const reminderBody = await reminder.json();
    expect(reminderBody.subscription.reminderSentAt).toBe("2026-03-05T12:00:00.000Z");

    const converted = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "convert_trial",
          subscriptionId: startBody.subscription.id,
          paymentBehavior: "success",
          now: "2026-03-08T12:00:00.000Z"
        })
      })
    );
    const convertedBody = await converted.json();
    expect(convertedBody.subscription.status).toBe("active");
    expect(convertedBody.subscription.convertedAt).toBe("2026-03-08T12:00:00.000Z");

    const analytics = await GET();
    const analyticsBody = await analytics.json();
    expect(analyticsBody.overview.converted).toBe(1);
    expect(analyticsBody.cohorts).toEqual([
      expect.objectContaining({
        cohort: "2026-03",
        trialStarts: 1,
        paidConversions: 1,
        conversionRate: 1
      })
    ]);
  });

  it("retries failed conversion billing with dunning and recovers on a later pass", async () => {
    const start = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "start_trial",
          userId: "user-retry-1",
          planId: "premium-monthly",
          priceCents: 1599,
          trialDays: 3,
          autoConvertOptIn: true,
          now: "2026-03-01T09:00:00.000Z"
        })
      })
    );
    const startBody = await start.json();

    const failedConversion = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "convert_trial",
          subscriptionId: startBody.subscription.id,
          paymentBehavior: "fail",
          now: "2026-03-04T09:00:00.000Z"
        })
      })
    );
    const failedBody = await failedConversion.json();
    expect(failedBody.subscription.status).toBe("past_due");
    expect(failedBody.subscription.billingRetryScheduledAt).toBe("2026-03-04T10:00:00.000Z");
    expect(failedBody.subscription.dunningStage).toBe("grace_period");

    const firstRetry = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "retry_billing",
          now: "2026-03-04T10:00:00.000Z",
          failSubscriptionIds: [startBody.subscription.id]
        })
      })
    );
    const firstRetryBody = await firstRetry.json();
    expect(firstRetryBody.results).toEqual([
      expect.objectContaining({
        subscriptionId: startBody.subscription.id,
        status: "retry_scheduled",
        retryCount: 1
      })
    ]);

    const recovered = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "retry_billing",
          now: "2026-03-04T12:00:00.000Z"
        })
      })
    );
    const recoveredBody = await recovered.json();
    expect(recoveredBody.results).toEqual([
      expect.objectContaining({
        subscriptionId: startBody.subscription.id,
        status: "recovered",
        retryCount: 2
      })
    ]);

    const analytics = await GET();
    const analyticsBody = await analytics.json();
    expect(analyticsBody.overview.activePaid).toBe(1);
    expect(analyticsBody.cohorts[0]).toEqual(
      expect.objectContaining({
        paidConversions: 1,
        recovered: 1
      })
    );
  });

  it("supports opt-out cancellation before auto-convert", async () => {
    const start = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "start_trial",
          userId: "user-cancel-1",
          autoConvertOptIn: false,
          now: "2026-03-02T12:00:00.000Z"
        })
      })
    );
    const startBody = await start.json();

    const cancelled = await POST(
      new Request("http://localhost/api/subscription/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          subscriptionId: startBody.subscription.id,
          reason: "user_opt_out",
          now: "2026-03-10T12:00:00.000Z"
        })
      })
    );
    const cancelledBody = await cancelled.json();
    expect(cancelledBody.subscription.status).toBe("cancelled");
    expect(cancelledBody.subscription.cancellationReason).toBe("user_opt_out");

    const analytics = await GET();
    const analyticsBody = await analytics.json();
    expect(analyticsBody.overview.cancelled).toBe(1);
    expect(analyticsBody.cohorts[0]).toEqual(
      expect.objectContaining({
        trialStarts: 1,
        cancelled: 1,
        paidConversions: 0
      })
    );
  });
});
