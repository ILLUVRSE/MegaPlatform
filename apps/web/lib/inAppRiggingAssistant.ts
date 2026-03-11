import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  generatedRigValid: z.boolean(),
  reviewCheckpointApproved: z.boolean(),
  generatedBoneCount: z.number().int().nonnegative()
});

const policySchema = z.object({
  requireReviewCheckpoint: z.boolean(),
  maxGeneratedBoneCount: z.number().int().positive()
});

const fallback = { requireReviewCheckpoint: true, maxGeneratedBoneCount: 160 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "in-app-rigging-assistant.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateInAppRiggingAssistant(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const checkpointMet = !policy.requireReviewCheckpoint || parsed.data.reviewCheckpointApproved;
  const boneCountMet = parsed.data.generatedBoneCount <= policy.maxGeneratedBoneCount;

  return {
    ok: true as const,
    assistantReady: parsed.data.generatedRigValid && checkpointMet && boneCountMet,
    checkpointMet,
    boneCountMet
  };
}
