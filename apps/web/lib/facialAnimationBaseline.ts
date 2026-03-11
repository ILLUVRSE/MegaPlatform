import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  expressionMap: z.record(z.string(), z.number().min(0).max(1)),
  controllerIds: z.array(z.string().min(1)).min(1)
});

const policySchema = z.object({
  requiredExpressions: z.array(z.string().min(1)).min(1),
  minimumReusableControllers: z.number().int().positive(),
  maxExpressionDelta: z.number().positive()
});

const fallback = {
  requiredExpressions: ["neutral", "joy", "sadness", "anger", "surprise"],
  minimumReusableControllers: 1,
  maxExpressionDelta: 1
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "facial-animation-baseline.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateFacialAnimationBaseline(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const expressionKeys = Object.keys(parsed.data.expressionMap);
  const missingExpressions = policy.requiredExpressions.filter((expression) => !expressionKeys.includes(expression));
  const invalidIntensity = Object.values(parsed.data.expressionMap).some((value) => value < 0 || value > policy.maxExpressionDelta);

  return {
    ok: true as const,
    baselineReady: missingExpressions.length === 0 && !invalidIntensity,
    reusableControllers: new Set(parsed.data.controllerIds).size,
    controllerReuseValid: new Set(parsed.data.controllerIds).size >= policy.minimumReusableControllers,
    missingExpressions: missingExpressions.sort()
  };
}
