import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ maxAllowedDrift: z.number().min(0), triggerPolicyCorrection: z.boolean() });
const requestSchema = z.object({
  missions: z.array(z.object({ id: z.string().min(1), targetValue: z.number().min(0).max(1), observedValue: z.number().min(0).max(1) })).min(1)
});
const fallback = { maxAllowedDrift: 0.2, triggerPolicyCorrection: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "long-horizon-value-alignment-monitor.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function monitorLongHorizonValueAlignment(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const drifts = parsed.data.missions.map((mission) => ({
    missionId: mission.id,
    drift: Number(Math.abs(mission.targetValue - mission.observedValue).toFixed(4))
  }));
  const maxDrift = drifts.reduce((max, row) => Math.max(max, row.drift), 0);
  const correctionRequired = policy.triggerPolicyCorrection && maxDrift > policy.maxAllowedDrift;

  return {
    ok: true as const,
    drifts,
    maxDrift,
    correctionRequired,
    correctionWorkflow: correctionRequired ? "policy_correction_required" : "none"
  };
}
