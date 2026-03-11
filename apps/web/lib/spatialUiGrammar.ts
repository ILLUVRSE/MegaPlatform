import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minDepthMeters: z.number().positive(),
  maxDepthMeters: z.number().positive(),
  requiredTokens: z.array(z.string().min(1)).min(1)
});

const requestSchema = z.object({
  surfaceId: z.string().min(1),
  depthMeters: z.number().positive(),
  tokens: z.array(z.string().min(1))
});

const fallback = { minDepthMeters: 0.5, maxDepthMeters: 3, requiredTokens: ["panel", "focus_ring", "affordance"] };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-ui-grammar.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateSpatialUiGrammar(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const depthValid = parsed.data.depthMeters >= policy.minDepthMeters && parsed.data.depthMeters <= policy.maxDepthMeters;
  const missingTokens = policy.requiredTokens.filter((token) => !parsed.data.tokens.includes(token));

  return { ok: true as const, surfaceId: parsed.data.surfaceId, depthValid, missingTokens, valid: depthValid && missingTokens.length === 0 };
}
