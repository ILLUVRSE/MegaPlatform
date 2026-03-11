import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  allowedModes: z.array(z.string().min(1)).min(1),
  defaultMode: z.string().min(1),
  requireComfortPolicy: z.boolean()
});

const requestSchema = z.object({ selectedModes: z.array(z.string().min(1)), comfortPolicyAccepted: z.boolean() });

const fallback = { allowedModes: ["teleport", "snap_turn", "vignette"], defaultMode: "teleport", requireComfortPolicy: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "comfort-locomotion-suite.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function enforceComfortLocomotionSuite(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const enforcedModes = parsed.data.selectedModes.filter((mode) => policy.allowedModes.includes(mode));
  if (enforcedModes.length === 0) enforcedModes.push(policy.defaultMode);

  const policySatisfied = !policy.requireComfortPolicy || parsed.data.comfortPolicyAccepted;
  return { ok: true as const, enforcedModes, policySatisfied, enforced: policySatisfied };
}
