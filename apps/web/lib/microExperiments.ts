import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const microPolicySchema = z.object({
  maxConcurrent: z.number().int().positive(),
  maxDurationMin: z.number().int().positive(),
  allowedRisk: z.array(z.enum(["low", "medium"])).min(1)
});

const defaultPolicy = {
  maxConcurrent: 5,
  maxDurationMin: 120,
  allowedRisk: ["low", "medium"] as Array<"low" | "medium">
};

export async function loadMicroExperimentPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "micro-experiments.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = microPolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function runMicroExperiment(input: {
  id: string;
  objectiveId: string;
  risk: "low" | "medium" | "high";
  expectedLift: number;
}) {
  const policy = await loadMicroExperimentPolicy();
  if (!policy.allowedRisk.includes(input.risk as "low" | "medium")) {
    return {
      ok: false,
      reason: `risk level '${input.risk}' not allowed for auto-runner`
    };
  }

  return {
    ok: true,
    experiment: {
      id: input.id,
      objectiveId: input.objectiveId,
      risk: input.risk,
      expectedLift: input.expectedLift,
      status: "running",
      startedAt: new Date().toISOString(),
      maxDurationMin: policy.maxDurationMin
    }
  };
}
