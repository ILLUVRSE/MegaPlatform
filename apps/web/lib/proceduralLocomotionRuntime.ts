import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ ikIntegrated: z.boolean(), collisionConstraintsApplied: z.boolean(), stepError: z.number().min(0) });
const policySchema = z.object({ requireIkIntegration: z.boolean(), requireCollisionConstraints: z.boolean(), maxStepError: z.number().min(0) });

const fallback = { requireIkIntegration: true, requireCollisionConstraints: true, maxStepError: 0.06 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "procedural-locomotion-runtime.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateProceduralLocomotionRuntime(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const ikOk = !policy.requireIkIntegration || parsed.data.ikIntegrated;
  const collisionOk = !policy.requireCollisionConstraints || parsed.data.collisionConstraintsApplied;
  const errorOk = parsed.data.stepError <= policy.maxStepError;

  return {
    ok: true as const,
    integratedWithIk: ikOk,
    integratedWithCollision: collisionOk,
    proceduralRuntimeReady: ikOk && collisionOk && errorOk
  };
}
