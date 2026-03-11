import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ unmappedJoints: z.number().int().nonnegative(), fixtureCases: z.number().int().nonnegative(), fallbackTriggered: z.boolean() });
const policySchema = z.object({ maxUnmappedJoints: z.number().int().nonnegative(), fallbackMode: z.string().min(1), requiredFixtureCoverage: z.number().int().positive() });

const fallback = { maxUnmappedJoints: 2, fallbackMode: "bind-pose-lock", requiredFixtureCoverage: 1 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "performance-to-rig-mapping-layer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluatePerformanceToRigMappingLayer(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const constraintsValid = parsed.data.unmappedJoints <= policy.maxUnmappedJoints;
  const fixturesValid = parsed.data.fixtureCases >= policy.requiredFixtureCoverage;

  return {
    ok: true as const,
    mappingValid: constraintsValid && fixturesValid,
    constraintsValid,
    fixturesValid,
    fallbackMode: parsed.data.fallbackTriggered ? policy.fallbackMode : null
  };
}
