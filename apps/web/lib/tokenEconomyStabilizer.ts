import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  targetTokenBudget: z.number().positive(),
  controlBandMinRatio: z.number().positive(),
  controlBandMaxRatio: z.number().positive(),
  maxAutoCorrectionRatio: z.number().min(0).max(1),
  stabilizationActions: z.array(z.string().min(1))
});

const requestSchema = z.object({
  observedTokenBudget: z.number().nonnegative()
});

const defaultPolicy = {
  targetTokenBudget: 100000,
  controlBandMinRatio: 0.9,
  controlBandMaxRatio: 1.1,
  maxAutoCorrectionRatio: 0.2,
  stabilizationActions: ["throttle_low_priority", "rebalance_compute_pool", "pause_non_critical_jobs"]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "token-economy-stabilizer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

export async function stabilizeTokenEconomy(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const ratio = policy.targetTokenBudget === 0 ? 0 : parsed.data.observedTokenBudget / policy.targetTokenBudget;

  const withinControlBand = ratio >= policy.controlBandMinRatio && ratio <= policy.controlBandMaxRatio;
  const varianceRatio = Math.abs(ratio - 1);
  const correctionRatio = Math.min(varianceRatio, policy.maxAutoCorrectionRatio);

  return {
    ok: true as const,
    withinControlBand,
    varianceRatio,
    correctionRatio,
    actions: withinControlBand ? [] : policy.stabilizationActions,
    policy
  };
}
