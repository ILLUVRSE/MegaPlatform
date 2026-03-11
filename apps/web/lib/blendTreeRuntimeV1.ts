import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const nodeSchema = z.object({ nodeId: z.string().min(1), depth: z.number().int().nonnegative(), blendMode: z.string().min(1) });
const requestSchema = z.object({ characterClasses: z.array(z.string().min(1)).min(1), nodes: z.array(nodeSchema).min(1) });
const policySchema = z.object({
  minCharacterClasses: z.number().int().positive(),
  maxBlendDepth: z.number().int().positive(),
  allowedBlendModes: z.array(z.string().min(1)).min(1)
});

const fallback = { minCharacterClasses: 2, maxBlendDepth: 6, allowedBlendModes: ["linear", "additive", "override"] };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "blend-tree-runtime-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateBlendTreeRuntimeV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const uniqueClasses = new Set(parsed.data.characterClasses);
  const depthExceeded = parsed.data.nodes.some((node) => node.depth > policy.maxBlendDepth);
  const invalidModes = parsed.data.nodes.filter((node) => !policy.allowedBlendModes.includes(node.blendMode)).map((node) => node.nodeId);

  return {
    ok: true as const,
    runtimeReady: uniqueClasses.size >= policy.minCharacterClasses && !depthExceeded && invalidModes.length === 0,
    drivesCharacterClasses: uniqueClasses.size,
    depthExceeded,
    invalidModes: invalidModes.sort()
  };
}
