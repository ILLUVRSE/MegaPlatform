import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ maxStages: z.number().int().min(1), rollbackSafetyRequired: z.boolean() });
const requestSchema = z.object({
  failures: z.array(z.object({ id: z.string().min(1), severity: z.number().min(0).max(1), reversible: z.boolean() })).min(1)
});
const fallback = { maxStages: 4, rollbackSafetyRequired: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "strategic-failure-recovery-planner.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function planStrategicFailureRecovery(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const stages = parsed.data.failures
    .filter((failure) => !policy.rollbackSafetyRequired || failure.reversible)
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))
    .slice(0, policy.maxStages)
    .map((failure, index) => ({
      stage: index + 1,
      failureId: failure.id,
      intervention: index === 0 ? "stabilize" : "optimize",
      rollbackSafe: failure.reversible,
      mode: index === 0 ? "roll_forward" : "rollback_ready"
    }));

  return { ok: true as const, recoveryPlan: stages };
}
