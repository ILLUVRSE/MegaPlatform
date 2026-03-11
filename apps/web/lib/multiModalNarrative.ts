import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  allowedFormats: z.array(z.enum(["text", "video", "audio", "game"])).min(1),
  maxArcSteps: z.number().int().positive(),
  requireSharedTheme: z.boolean()
});

const requestSchema = z.object({
  narrativeId: z.string().min(1),
  theme: z.string().min(1),
  assets: z.array(
    z.object({
      id: z.string().min(1),
      format: z.enum(["text", "video", "audio", "game"]),
      title: z.string().min(1)
    })
  )
});

const defaultPolicy = {
  allowedFormats: ["text", "video", "audio", "game"],
  maxArcSteps: 6,
  requireSharedTheme: true
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadPolicy() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "multi-modal-narrative.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function buildMultiModalNarrativeArc(rawInput: unknown) {
  const parsed = requestSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: "invalid_input" };

  const policy = await loadPolicy();
  const eligibleAssets = parsed.data.assets.filter((asset) => policy.allowedFormats.includes(asset.format));
  const steps = eligibleAssets.slice(0, policy.maxArcSteps).map((asset, index) => ({
    step: index + 1,
    assetId: asset.id,
    format: asset.format,
    title: asset.title,
    beat: `${parsed.data.theme} beat ${index + 1}`
  }));

  return {
    ok: true as const,
    narrativeId: parsed.data.narrativeId,
    theme: parsed.data.theme,
    steps,
    trackable: steps.length > 0,
    generatedAt: new Date().toISOString()
  };
}
