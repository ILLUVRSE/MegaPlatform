import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";

const DEFAULT_STATE = {
  wallets: {},
  tips: {},
  idempotencyKeys: {},
  payoutQueue: [],
  payoutBatches: [],
  fraudReviews: []
};

const HIGH_RISK_SCORE = 70;
const RETRY_BACKOFF_MS = 60_000;
const LOCK_RETRY_MS = 20;
const LOCK_RETRY_LIMIT = 200;

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function findRepoRoot() {
  let current = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export async function resolveCreatorEconomyRoot(rootOverride) {
  if (rootOverride) return rootOverride;
  if (process.env.CREATOR_ECONOMY_DATA_ROOT) return process.env.CREATOR_ECONOMY_DATA_ROOT;
  const repoRoot = await findRepoRoot();
  return path.join(repoRoot, "artifacts", "creator-economy");
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function resolveStatePath(rootOverride) {
  const root = await resolveCreatorEconomyRoot(rootOverride);
  await ensureDir(root);
  return path.join(root, "ledger.json");
}

async function acquireLock(rootOverride) {
  const root = await resolveCreatorEconomyRoot(rootOverride);
  const lockPath = path.join(root, ".lock");

  for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt += 1) {
    try {
      await fs.mkdir(lockPath);
      return async () => {
        await fs.rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }

  throw new Error("creator_economy_lock_timeout");
}

async function withState(mutator, rootOverride) {
  const releaseLock = await acquireLock(rootOverride);
  try {
    const file = await resolveStatePath(rootOverride);
    const current = await loadCreatorEconomyState(rootOverride);
    const draft = structuredClone(current);
    const result = await mutator(draft);
    const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(draft, null, 2));
    await fs.rename(tempFile, file);
    return result;
  } finally {
    await releaseLock();
  }
}

export async function loadCreatorEconomyState(rootOverride) {
  const file = await resolveStatePath(rootOverride);
  if (!(await exists(file))) {
    await fs.writeFile(file, JSON.stringify(DEFAULT_STATE, null, 2));
    return structuredClone(DEFAULT_STATE);
  }

  const raw = await fs.readFile(file, "utf-8");
  const parsed = JSON.parse(raw);
  return {
    wallets: parsed.wallets ?? {},
    tips: parsed.tips ?? {},
    idempotencyKeys: parsed.idempotencyKeys ?? {},
    payoutQueue: parsed.payoutQueue ?? [],
    payoutBatches: parsed.payoutBatches ?? [],
    fraudReviews: parsed.fraudReviews ?? []
  };
}

function getWalletKey(ownerType, ownerId) {
  return `${ownerType}:${ownerId}`;
}

function upsertWallet(state, ownerType, ownerId, seed = {}) {
  const key = getWalletKey(ownerType, ownerId);
  const current = state.wallets[key] ?? {
    walletId: key,
    ownerType,
    ownerId,
    balanceCents: 0,
    pendingPayoutCents: 0,
    paidOutCents: 0,
    lifetimeDebitedCents: 0,
    lifetimeCreditedCents: 0,
    updatedAt: new Date(0).toISOString()
  };
  const next = {
    ...current,
    ...seed,
    walletId: key,
    ownerType,
    ownerId,
    updatedAt: new Date().toISOString()
  };
  state.wallets[key] = next;
  return next;
}

export async function seedWallet(input, rootOverride) {
  return withState((state) => {
    const wallet = upsertWallet(state, input.ownerType, input.ownerId, {
      balanceCents: input.balanceCents ?? 0,
      pendingPayoutCents: input.pendingPayoutCents ?? 0,
      paidOutCents: input.paidOutCents ?? 0
    });
    return wallet;
  }, rootOverride);
}

export function evaluateTipFraud(candidate, state, now = Date.now()) {
  const recentTips = Object.values(state.tips).filter((tip) => now - Date.parse(tip.createdAt) <= 24 * 60 * 60 * 1000);
  const creatorTips = recentTips.filter((tip) => tip.creatorId === candidate.creatorId);
  const fanTips = recentTips.filter((tip) => tip.fanId === candidate.fanId);
  const ipTips = recentTips.filter((tip) => candidate.ipAddress && tip.ipAddress === candidate.ipAddress);
  const deviceTips = recentTips.filter((tip) => candidate.deviceId && tip.deviceId === candidate.deviceId);
  const lastHourFanCount = fanTips.filter((tip) => now - Date.parse(tip.createdAt) <= 60 * 60 * 1000).length;
  const lastTenMinuteFanCount = fanTips.filter((tip) => now - Date.parse(tip.createdAt) <= 10 * 60 * 1000).length;
  const distinctDevices = new Set(fanTips.map((tip) => tip.deviceId).filter(Boolean));
  if (candidate.deviceId) distinctDevices.add(candidate.deviceId);
  const distinctIps = new Set(fanTips.map((tip) => tip.ipAddress).filter(Boolean));
  if (candidate.ipAddress) distinctIps.add(candidate.ipAddress);
  const distinctFansFromIp = new Set(ipTips.map((tip) => tip.fanId));
  distinctFansFromIp.add(candidate.fanId);
  const distinctCreatorsFromDevice = new Set(deviceTips.map((tip) => tip.creatorId));
  distinctCreatorsFromDevice.add(candidate.creatorId);
  const creatorAmounts = creatorTips.map((tip) => tip.amountCents).sort((a, b) => a - b);
  const baselineLargeTip = creatorAmounts.length === 0 ? 20_000 : creatorAmounts[Math.floor(creatorAmounts.length * 0.9)] || creatorAmounts.at(-1);

  const reasons = [];
  let score = 0;

  if (lastTenMinuteFanCount >= 3 || lastHourFanCount >= 5) {
    reasons.push("velocity_spike");
    score += 30;
  }

  if (distinctDevices.size >= 3 || distinctIps.size >= 3 || distinctFansFromIp.size >= 4 || distinctCreatorsFromDevice.size >= 4) {
    reasons.push("ip_device_mix");
    score += 25;
  }

  if (candidate.amountCents >= Math.max(50_000, baselineLargeTip * 3)) {
    reasons.push("unusually_large_tip");
    score += 70;
  }

  return {
    flagged: score >= HIGH_RISK_SCORE,
    score,
    reasons,
    signals: {
      lastTenMinuteFanCount,
      lastHourFanCount,
      distinctDevices: distinctDevices.size,
      distinctIps: distinctIps.size,
      distinctFansFromIp: distinctFansFromIp.size,
      distinctCreatorsFromDevice: distinctCreatorsFromDevice.size,
      baselineLargeTipCents: baselineLargeTip
    }
  };
}

export async function createTip(input, rootOverride) {
  if (!input?.idempotencyKey || !input?.fanId || !input?.creatorId || !Number.isFinite(input?.amountCents) || input.amountCents <= 0) {
    return { ok: false, reason: "invalid_tip_request" };
  }

  return withState((state) => {
    const existingTipId = state.idempotencyKeys[input.idempotencyKey];
    if (existingTipId) {
      const existing = state.tips[existingTipId];
      return {
        ok: true,
        idempotent: true,
        tip: existing,
        fraud: existing.fraud
      };
    }

    const fanWallet = upsertWallet(state, "fan", input.fanId);
    const creatorWallet = upsertWallet(state, "creator", input.creatorId);
    if (fanWallet.balanceCents < input.amountCents) {
      return { ok: false, reason: "insufficient_balance" };
    }

    const createdAt = input.createdAt ?? new Date().toISOString();
    const fraud = evaluateTipFraud({ ...input, createdAt }, state, Date.parse(createdAt));
    const tipId = `tip_${randomUUID()}`;
    const tip = {
      id: tipId,
      idempotencyKey: input.idempotencyKey,
      fanId: input.fanId,
      creatorId: input.creatorId,
      amountCents: input.amountCents,
      currency: input.currency ?? "USD",
      ipAddress: input.ipAddress ?? null,
      deviceId: input.deviceId ?? null,
      userAgent: input.userAgent ?? null,
      source: input.source ?? "api",
      createdAt,
      payoutStatus: fraud.flagged ? "review" : "queued",
      fraud
    };

    fanWallet.balanceCents -= input.amountCents;
    fanWallet.lifetimeDebitedCents += input.amountCents;
    creatorWallet.pendingPayoutCents += input.amountCents;
    creatorWallet.lifetimeCreditedCents += input.amountCents;
    fanWallet.updatedAt = createdAt;
    creatorWallet.updatedAt = createdAt;

    state.tips[tipId] = tip;
    state.idempotencyKeys[input.idempotencyKey] = tipId;

    if (fraud.flagged) {
      state.fraudReviews.push({
        id: `review_${randomUUID()}`,
        tipId,
        creatorId: input.creatorId,
        fanId: input.fanId,
        status: "pending_review",
        reasons: fraud.reasons,
        signals: fraud.signals,
        createdAt
      });
    } else {
      state.payoutQueue.push({
        id: `event_${randomUUID()}`,
        tipId,
        creatorId: input.creatorId,
        amountCents: input.amountCents,
        status: "queued",
        retryCount: 0,
        availableAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        lastError: null,
        batchId: null
      });
    }

    return { ok: true, idempotent: false, tip, fraud };
  }, rootOverride);
}

export async function createPayoutBatches(options = {}, rootOverride) {
  const batchSize = options.batchSize ?? 25;
  const now = options.now ?? new Date().toISOString();

  return withState((state) => {
    const readyEvents = state.payoutQueue.filter((event) => event.status === "queued" && Date.parse(event.availableAt) <= Date.parse(now));
    const grouped = new Map();
    for (const event of readyEvents) {
      const current = grouped.get(event.creatorId) ?? [];
      current.push(event);
      grouped.set(event.creatorId, current);
    }

    const batches = [];
    for (const [creatorId, events] of grouped.entries()) {
      for (let index = 0; index < events.length; index += batchSize) {
        const slice = events.slice(index, index + batchSize);
        const batch = {
          id: `batch_${randomUUID()}`,
          creatorId,
          eventIds: slice.map((event) => event.id),
          amountCents: slice.reduce((sum, event) => sum + event.amountCents, 0),
          status: "pending_processor",
          attempts: 0,
          processor: options.processor ?? "fake",
          processorRunId: null,
          lastError: null,
          createdAt: now,
          updatedAt: now
        };
        state.payoutBatches.push(batch);
        for (const event of slice) {
          event.status = "batched";
          event.batchId = batch.id;
          event.updatedAt = now;
        }
        batches.push(batch);
      }
    }

    return batches;
  }, rootOverride);
}

export async function previewPayoutBatches(options = {}, rootOverride) {
  const batchSize = options.batchSize ?? 25;
  const now = options.now ?? new Date().toISOString();
  const state = await loadCreatorEconomyState(rootOverride);
  const readyEvents = state.payoutQueue.filter((event) => event.status === "queued" && Date.parse(event.availableAt) <= Date.parse(now));
  const grouped = new Map();

  for (const event of readyEvents) {
    const current = grouped.get(event.creatorId) ?? [];
    current.push(event);
    grouped.set(event.creatorId, current);
  }

  const preview = [];
  for (const [creatorId, events] of grouped.entries()) {
    for (let index = 0; index < events.length; index += batchSize) {
      const slice = events.slice(index, index + batchSize);
      preview.push({
        creatorId,
        eventIds: slice.map((event) => event.id),
        amountCents: slice.reduce((sum, event) => sum + event.amountCents, 0),
        eventCount: slice.length,
        processor: options.processor ?? "fake"
      });
    }
  }

  return preview;
}

async function fakeProcessor(batch, options = {}) {
  if (options.failCreatorIds?.includes(batch.creatorId)) {
    throw new Error("simulated processor failure");
  }

  return {
    processor: "fake",
    processorRunId: `fake_${batch.id}`,
    processedAt: options.now ?? new Date().toISOString()
  };
}

export async function runPayoutProcessor(options = {}, rootOverride) {
  const now = options.now ?? new Date().toISOString();
  const dryRun = Boolean(options.dryRun);

  return withState(async (state) => {
    const pending = state.payoutBatches.filter((batch) => batch.status === "pending_processor" || batch.status === "retryable");
    const results = [];

    for (const batch of pending) {
      if (batch.status === "retryable" && Date.parse(batch.nextAttemptAt ?? now) > Date.parse(now)) continue;

      try {
        const processorResult = await fakeProcessor(batch, options);
        batch.attempts += 1;
        batch.status = dryRun ? "dry_run" : "paid";
        batch.processor = processorResult.processor;
        batch.processorRunId = processorResult.processorRunId;
        batch.updatedAt = now;
        batch.lastError = null;

        if (!dryRun) {
          const creatorWallet = upsertWallet(state, "creator", batch.creatorId);
          creatorWallet.pendingPayoutCents = Math.max(0, creatorWallet.pendingPayoutCents - batch.amountCents);
          creatorWallet.paidOutCents += batch.amountCents;
          creatorWallet.updatedAt = now;
        }

        for (const eventId of batch.eventIds) {
          const event = state.payoutQueue.find((entry) => entry.id === eventId);
          if (!event) continue;
          event.status = dryRun ? "dry_run" : "paid";
          event.updatedAt = now;
        }

        results.push({ batchId: batch.id, status: batch.status, amountCents: batch.amountCents });
      } catch (error) {
        batch.attempts += 1;
        batch.status = "retryable";
        batch.lastError = error instanceof Error ? error.message : "unknown_processor_error";
        batch.nextAttemptAt = new Date(Date.parse(now) + RETRY_BACKOFF_MS * batch.attempts).toISOString();
        batch.updatedAt = now;

        for (const eventId of batch.eventIds) {
          const event = state.payoutQueue.find((entry) => entry.id === eventId);
          if (!event) continue;
          event.status = "retryable";
          event.retryCount += 1;
          event.availableAt = batch.nextAttemptAt;
          event.lastError = batch.lastError;
          event.updatedAt = now;
        }

        results.push({ batchId: batch.id, status: "retryable", error: batch.lastError });
      }
    }

    return results;
  }, rootOverride);
}

export async function summarizeCreatorEconomy(rootOverride) {
  const state = await loadCreatorEconomyState(rootOverride);
  return {
    wallets: Object.values(state.wallets),
    tips: Object.values(state.tips),
    payoutQueue: state.payoutQueue,
    payoutBatches: state.payoutBatches,
    fraudReviews: state.fraudReviews
  };
}
