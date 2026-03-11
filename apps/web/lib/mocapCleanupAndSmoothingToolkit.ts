import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  inputJitter: z.number().min(0),
  outputJitter: z.number().min(0),
  outputNoise: z.number().min(0),
  operators: z.array(z.string().min(1)).min(1)
});

const policySchema = z.object({ minimumJitterImprovement: z.number().min(0), maxResidualJitter: z.number().min(0), maxResidualNoise: z.number().min(0) });

const fallback = { minimumJitterImprovement: 0.25, maxResidualJitter: 0.08, maxResidualNoise: 0.1 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "mocap-cleanup-and-smoothing-toolkit.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateMocapCleanupAndSmoothingToolkit(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const jitterImprovement = parsed.data.inputJitter === 0 ? 1 : (parsed.data.inputJitter - parsed.data.outputJitter) / parsed.data.inputJitter;

  return {
    ok: true as const,
    reusableOperators: parsed.data.operators.length,
    qualityDiagnostics: {
      jitterImprovement,
      residualJitter: parsed.data.outputJitter,
      residualNoise: parsed.data.outputNoise
    },
    cleanupEffective:
      jitterImprovement >= policy.minimumJitterImprovement &&
      parsed.data.outputJitter <= policy.maxResidualJitter &&
      parsed.data.outputNoise <= policy.maxResidualNoise
  };
}
