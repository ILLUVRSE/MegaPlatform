import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  worldScale: z.number().positive(),
  maxTerrainSlopeDegrees: z.number().nonnegative(),
  terrainPatchCount: z.number().int().nonnegative()
});

const policySchema = z.object({
  minWorldScale: z.number().positive(),
  maxWorldScale: z.number().positive(),
  maxTerrainSlopeDegrees: z.number().nonnegative()
});

const fallback = { minWorldScale: 0.25, maxWorldScale: 4, maxTerrainSlopeDegrees: 45 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "terrain-and-scale-governance.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateTerrainAndScaleGovernance(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const scaleValid = parsed.data.worldScale >= policy.minWorldScale && parsed.data.worldScale <= policy.maxWorldScale;
  const terrainValid = parsed.data.maxTerrainSlopeDegrees <= policy.maxTerrainSlopeDegrees;

  return {
    ok: true as const,
    policyCompliant: scaleValid && terrainValid,
    scaleValid,
    terrainValid,
    terrainPatchCount: parsed.data.terrainPatchCount
  };
}
