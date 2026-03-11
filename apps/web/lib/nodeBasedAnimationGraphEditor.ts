import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  nodeCount: z.number().int().nonnegative(),
  hasBlendContract: z.boolean(),
  hasStateContract: z.boolean(),
  serializationVersion: z.string().min(1)
});

const policySchema = z.object({
  maxNodeCount: z.number().int().positive(),
  requireRuntimeContractSerialization: z.boolean()
});

const fallback = { maxNodeCount: 250, requireRuntimeContractSerialization: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "node-based-animation-graph-editor.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateNodeBasedAnimationGraphEditor(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const nodeBudgetMet = parsed.data.nodeCount <= policy.maxNodeCount;
  const contractsSerialized = parsed.data.hasBlendContract && parsed.data.hasStateContract && parsed.data.serializationVersion.trim().length > 0;
  const compliant = nodeBudgetMet && (!policy.requireRuntimeContractSerialization || contractsSerialized);

  return {
    ok: true as const,
    editorReady: compliant,
    nodeBudgetMet,
    contractsSerialized
  };
}
