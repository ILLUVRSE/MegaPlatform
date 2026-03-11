import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minRoiRatio: z.number().positive(),
  confidenceFloor: z.number().min(0).max(1),
  maxPaybackDays: z.number().int().positive(),
  requirePositiveNetValue: z.boolean()
});

const requestSchema = z.object({
  actionId: z.string().min(1),
  expectedReturnCents: z.number().int().nonnegative(),
  expectedCostCents: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  paybackDays: z.number().int().nonnegative()
});

const defaultPolicy = {
  minRoiRatio: 1.2,
  confidenceFloor: 0.55,
  maxPaybackDays: 45,
  requirePositiveNetValue: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "roi-constrained-action-planner.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateRoiConstrainedAction(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const roiRatio = parsed.data.expectedReturnCents / parsed.data.expectedCostCents;
  const netValueCents = parsed.data.expectedReturnCents - parsed.data.expectedCostCents;

  const blockers: string[] = [];
  if (roiRatio < policy.minRoiRatio) blockers.push("roi_below_minimum");
  if (parsed.data.confidence < policy.confidenceFloor) blockers.push("confidence_below_floor");
  if (parsed.data.paybackDays > policy.maxPaybackDays) blockers.push("payback_too_slow");
  if (policy.requirePositiveNetValue && netValueCents <= 0) blockers.push("non_positive_net_value");

  return {
    ok: true as const,
    actionId: parsed.data.actionId,
    approved: blockers.length === 0,
    blockers,
    roiRatio,
    netValueCents,
    policy
  };
}
