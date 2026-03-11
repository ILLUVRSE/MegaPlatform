import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  chainLength: z.number().int().positive(),
  solveIterations: z.number().int().positive(),
  targetReachable: z.boolean()
});

const policySchema = z.object({
  maxChainLength: z.number().int().positive(),
  maxSolveIterations: z.number().int().positive(),
  deterministicFallbackMode: z.string().min(1)
});

const fallback = { maxChainLength: 16, maxSolveIterations: 24, deterministicFallbackMode: "fk_lock" };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "ik-fk-solver-service.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateIkFkSolverService(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const overPolicy =
    parsed.data.chainLength > policy.maxChainLength || parsed.data.solveIterations > policy.maxSolveIterations;
  const fallbackApplied = !parsed.data.targetReachable || overPolicy;

  return {
    ok: true as const,
    solverReusable: true,
    deterministicFallback: fallbackApplied,
    fallbackMode: fallbackApplied ? policy.deterministicFallbackMode : null,
    solvedWithIk: parsed.data.targetReachable && !overPolicy
  };
}
