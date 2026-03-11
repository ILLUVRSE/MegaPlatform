import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  concurrentEditors: z.number().int().positive(),
  conflictResolvedDeterministically: z.boolean(),
  auditTrailCaptured: z.boolean(),
  conflictResolutionMs: z.number().nonnegative()
});

const policySchema = z.object({
  requireDeterministicConflictResolution: z.boolean(),
  requireAuditTrail: z.boolean(),
  maxConflictResolutionMs: z.number().nonnegative()
});

const fallback = {
  requireDeterministicConflictResolution: true,
  requireAuditTrail: true,
  maxConflictResolutionMs: 400
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "collaborative-scene-editing.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCollaborativeSceneEditing(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const deterministicMet = !policy.requireDeterministicConflictResolution || parsed.data.conflictResolvedDeterministically;
  const auditMet = !policy.requireAuditTrail || parsed.data.auditTrailCaptured;
  const latencyMet = parsed.data.conflictResolutionMs <= policy.maxConflictResolutionMs;

  return {
    ok: true as const,
    collaborationReady: deterministicMet && auditMet && latencyMet,
    deterministicMet,
    auditMet,
    latencyMet
  };
}
