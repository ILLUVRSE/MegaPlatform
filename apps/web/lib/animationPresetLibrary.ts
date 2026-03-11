import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  presetCatalogAvailable: z.boolean(),
  retargetIntegrationReady: z.boolean(),
  blendIntegrationReady: z.boolean(),
  governanceCompliant: z.boolean()
});

const policySchema = z.object({
  requireRetargetIntegration: z.boolean(),
  requireBlendIntegration: z.boolean(),
  requireGovernanceCompliance: z.boolean()
});

const fallback = {
  requireRetargetIntegration: true,
  requireBlendIntegration: true,
  requireGovernanceCompliance: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "animation-preset-library.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateAnimationPresetLibrary(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const retargetMet = !policy.requireRetargetIntegration || parsed.data.retargetIntegrationReady;
  const blendMet = !policy.requireBlendIntegration || parsed.data.blendIntegrationReady;
  const governanceMet = !policy.requireGovernanceCompliance || parsed.data.governanceCompliant;

  return {
    ok: true as const,
    libraryReady: parsed.data.presetCatalogAvailable && retargetMet && blendMet && governanceMet,
    retargetMet,
    blendMet,
    governanceMet
  };
}
