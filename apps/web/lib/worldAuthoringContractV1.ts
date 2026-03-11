import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  sceneNodeCount: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.string()),
  ownershipConflicts: z.number().int().nonnegative()
});

const policySchema = z.object({
  maxSceneNodeCount: z.number().int().positive(),
  requiredMetadataFields: z.array(z.string().min(1)).min(1),
  allowSharedOwnership: z.boolean()
});

const fallback = {
  maxSceneNodeCount: 5000,
  requiredMetadataFields: ["worldId", "ownerId", "theme"],
  allowSharedOwnership: false
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "world-authoring-contract-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateWorldAuthoringContractV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const compositionValid = parsed.data.sceneNodeCount <= policy.maxSceneNodeCount;
  const metadataValid = policy.requiredMetadataFields.every((field) => {
    const value = parsed.data.metadata[field];
    return typeof value === "string" && value.trim().length > 0;
  });
  const ownershipValid = policy.allowSharedOwnership || parsed.data.ownershipConflicts === 0;

  return {
    ok: true as const,
    contractValid: compositionValid && metadataValid && ownershipValid,
    compositionValid,
    metadataValid,
    ownershipValid
  };
}
