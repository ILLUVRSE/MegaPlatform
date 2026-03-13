import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { POST } from "@/app/api/creator/tip/route";
import {
  createPayoutBatches,
  runPayoutProcessor,
  seedWallet,
  summarizeCreatorEconomy
} from "../../../../packages/payments/core.mjs";

describe("creator payouts integration", () => {
  let root = "";
  const originalRoot = process.env.CREATOR_ECONOMY_DATA_ROOT;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "illuvrse-creator-economy-"));
    process.env.CREATOR_ECONOMY_DATA_ROOT = root;
  });

  afterEach(async () => {
    process.env.CREATOR_ECONOMY_DATA_ROOT = originalRoot;
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates an idempotent tip, batches payout, and pays it through the fake processor", async () => {
    await seedWallet({ ownerType: "fan", ownerId: "fan-1", balanceCents: 25_000 }, root);
    const payload = JSON.stringify({
      idempotencyKey: "tip-idempotency-key-1",
      fanId: "fan-1",
      creatorId: "creator-1",
      amountCents: 5_000,
      deviceId: "device-1"
    });

    const request = new Request("http://localhost/api/creator/tip", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.8",
        "user-agent": "vitest"
      },
      body: payload
    });

    const first = await POST(request);
    const firstBody = await first.json();
    expect(first.status).toBe(201);
    expect(firstBody.ok).toBe(true);
    expect(firstBody.idempotent).toBe(false);

    const second = await POST(
      new Request("http://localhost/api/creator/tip", {
        method: "POST",
        headers: request.headers,
        body: payload
      })
    );
    const secondBody = await second.json();
    expect(second.status).toBe(200);
    expect(secondBody.idempotent).toBe(true);
    expect(secondBody.tip.id).toBe(firstBody.tip.id);

    const created = await createPayoutBatches({ batchSize: 10, processor: "fake" }, root);
    expect(created).toHaveLength(1);
    expect(created[0].amountCents).toBe(5_000);

    const processed = await runPayoutProcessor({ processor: "fake" }, root);
    expect(processed).toEqual([
      expect.objectContaining({
        batchId: created[0].id,
        status: "paid",
        amountCents: 5_000
      })
    ]);

    const summary = await summarizeCreatorEconomy(root);
    const fanWallet = summary.wallets.find((wallet) => wallet.walletId === "fan:fan-1");
    const creatorWallet = summary.wallets.find((wallet) => wallet.walletId === "creator:creator-1");
    expect(fanWallet?.balanceCents).toBe(20_000);
    expect(creatorWallet?.pendingPayoutCents).toBe(0);
    expect(creatorWallet?.paidOutCents).toBe(5_000);
    expect(summary.fraudReviews).toHaveLength(0);
  });

  it("flags suspicious tips for review and keeps them out of payout batches", async () => {
    await seedWallet({ ownerType: "fan", ownerId: "fan-2", balanceCents: 300_000 }, root);

    const flagged = await POST(
      new Request("http://localhost/api/creator/tip", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.11",
          "user-agent": "vitest"
        },
        body: JSON.stringify({
          idempotencyKey: "tip-idempotency-key-flagged",
          fanId: "fan-2",
          creatorId: "creator-2",
          amountCents: 125_000,
          deviceId: "device-a"
        })
      })
    );

    const flaggedBody = await flagged.json();
    expect(flagged.status).toBe(201);
    expect(flaggedBody.tip.payoutStatus).toBe("review");
    expect(flaggedBody.fraud.flagged).toBe(true);
    expect(flaggedBody.fraud.reasons).toContain("unusually_large_tip");

    const batches = await createPayoutBatches({ batchSize: 10, processor: "fake" }, root);
    expect(batches).toHaveLength(0);

    const summary = await summarizeCreatorEconomy(root);
    expect(summary.fraudReviews).toHaveLength(1);
    expect(summary.payoutQueue).toHaveLength(0);
    const creatorWallet = summary.wallets.find((wallet) => wallet.walletId === "creator:creator-2");
    expect(creatorWallet?.pendingPayoutCents).toBe(125_000);
  });

  it("retries failed fake processor runs and settles on a later pass", async () => {
    await seedWallet({ ownerType: "fan", ownerId: "fan-3", balanceCents: 60_000 }, root);

    await POST(
      new Request("http://localhost/api/creator/tip", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.44",
          "user-agent": "vitest"
        },
        body: JSON.stringify({
          idempotencyKey: "tip-idempotency-key-retry",
          fanId: "fan-3",
          creatorId: "creator-retry",
          amountCents: 10_000,
          deviceId: "device-retry"
        })
      })
    );

    const created = await createPayoutBatches({ batchSize: 10, processor: "fake" }, root);
    expect(created).toHaveLength(1);

    const firstAttempt = await runPayoutProcessor(
      {
        processor: "fake",
        failCreatorIds: ["creator-retry"],
        now: "2026-03-13T12:00:00.000Z"
      },
      root
    );
    expect(firstAttempt).toEqual([
      expect.objectContaining({
        batchId: created[0].id,
        status: "retryable"
      })
    ]);

    const secondAttempt = await runPayoutProcessor({ processor: "fake", now: "2026-03-13T12:03:00.000Z" }, root);
    expect(secondAttempt).toEqual([
      expect.objectContaining({
        batchId: created[0].id,
        status: "paid",
        amountCents: 10_000
      })
    ]);
  });
});
