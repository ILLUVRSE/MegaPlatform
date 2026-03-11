import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  requiredSurfaces: z.array(z.string().min(1)).min(1),
  requiredContextKeys: z.array(z.string().min(1)).min(1),
  maxIdleMinutes: z.number().int().positive(),
  allowPartialContinuityAboveRisk: z.boolean()
});

const requestSchema = z.object({
  fromSurface: z.string().min(1),
  toSurface: z.string().min(1),
  context: z.record(z.string(), z.string().min(1)),
  idleMinutes: z.number().int().nonnegative(),
  riskLevel: z.enum(["low", "medium", "high"])
});

const defaultPolicy = {
  requiredSurfaces: ["watch", "shorts", "games", "narrative"],
  requiredContextKeys: ["profileId", "sessionId", "contentAnchor"],
  maxIdleMinutes: 25,
  allowPartialContinuityAboveRisk: false
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "cross-format-continuity-engine.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateCrossFormatContinuity(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  if (!policy.requiredSurfaces.includes(parsed.data.fromSurface) || !policy.requiredSurfaces.includes(parsed.data.toSurface)) {
    return { ok: false as const, reason: "unsupported_surface" };
  }

  const missingContextKeys = policy.requiredContextKeys.filter((key) => !(key in parsed.data.context));
  const idleExpired = parsed.data.idleMinutes > policy.maxIdleMinutes;
  const partialAllowed = policy.allowPartialContinuityAboveRisk && parsed.data.riskLevel === "high";

  const continuityBroken = (missingContextKeys.length > 0 && !partialAllowed) || idleExpired;

  return {
    ok: true as const,
    coherent: !continuityBroken,
    summary: {
      missingContextKeys,
      idleExpired,
      preservedKeyCount: Object.keys(parsed.data.context).length,
      transition: `${parsed.data.fromSurface}->${parsed.data.toSurface}`
    }
  };
}
