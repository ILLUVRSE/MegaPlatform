import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  sourceRigFamily: z.string().min(1),
  targetRigFamily: z.string().min(1),
  qualityScore: z.number().min(0).max(1),
  jointError: z.number().min(0)
});

const policySchema = z.object({
  supportedRigFamilies: z.array(z.string().min(1)).min(1),
  minimumQualityScore: z.number().min(0).max(1),
  maxJointError: z.number().min(0)
});

const fallback = {
  supportedRigFamilies: ["humanoid", "stylized_humanoid", "quadruped"],
  minimumQualityScore: 0.9,
  maxJointError: 0.08
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "retargeting-engine-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateRetargetingEngineV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const sourceSupported = policy.supportedRigFamilies.includes(parsed.data.sourceRigFamily);
  const targetSupported = policy.supportedRigFamilies.includes(parsed.data.targetRigFamily);
  const qualityChecksPassed =
    parsed.data.qualityScore >= policy.minimumQualityScore && parsed.data.jointError <= policy.maxJointError;

  return {
    ok: true as const,
    consistentMotion: sourceSupported && targetSupported && qualityChecksPassed,
    qualityChecksPassed,
    sourceSupported,
    targetSupported,
    normalizedRigPair: [parsed.data.sourceRigFamily, parsed.data.targetRigFamily].join("->")
  };
}
