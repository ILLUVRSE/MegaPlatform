import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  hookType: z.string().min(1),
  mutationScope: z.number().int().nonnegative(),
  safetyGuardrailPassed: z.boolean(),
  storyContextSafe: z.boolean()
});

const policySchema = z.object({
  allowedHookTypes: z.array(z.string().min(1)).min(1),
  maxMutationScope: z.number().int().nonnegative(),
  requireSafetyGuardrails: z.boolean()
});

const fallback = {
  allowedHookTypes: ["ambient_shift", "prop_recontextualization", "npc_dialogue_seed"],
  maxMutationScope: 3,
  requireSafetyGuardrails: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "environmental-storytelling-agent-hooks.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateEnvironmentalStorytellingAgentHooks(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const hookAllowed = policy.allowedHookTypes.includes(parsed.data.hookType);
  const mutationBounded = parsed.data.mutationScope <= policy.maxMutationScope;
  const guardrailsPassed = !policy.requireSafetyGuardrails || parsed.data.safetyGuardrailPassed;
  const safe = hookAllowed && mutationBounded && guardrailsPassed && parsed.data.storyContextSafe;

  return {
    ok: true as const,
    hooksPermitted: safe,
    hookAllowed,
    mutationBounded,
    guardrailsPassed
  };
}
