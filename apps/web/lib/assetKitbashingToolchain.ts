import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  sourceAssetCount: z.number().int().nonnegative(),
  provenanceAttached: z.boolean(),
  compatibilityChecksPassed: z.boolean()
});

const policySchema = z.object({
  maxSourceAssetCount: z.number().int().positive(),
  requireProvenance: z.boolean(),
  requireCompatibilityChecks: z.boolean()
});

const fallback = { maxSourceAssetCount: 50, requireProvenance: true, requireCompatibilityChecks: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "asset-kitbashing-toolchain.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateAssetKitbashingToolchain(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const sourceCountMet = parsed.data.sourceAssetCount <= policy.maxSourceAssetCount;
  const provenanceMet = !policy.requireProvenance || parsed.data.provenanceAttached;
  const compatibilityMet = !policy.requireCompatibilityChecks || parsed.data.compatibilityChecksPassed;

  return {
    ok: true as const,
    pipelineReady: sourceCountMet && provenanceMet && compatibilityMet,
    sourceCountMet,
    provenanceMet,
    compatibilityMet
  };
}
