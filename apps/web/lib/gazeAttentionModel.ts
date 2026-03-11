import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minimumDwellMs: z.number().int().positive(),
  minimumAttentionScore: z.number().min(0).max(1),
  policyControls: z.array(z.string().min(1)).min(1)
});

const requestSchema = z.object({
  dwellMs: z.number().int().nonnegative(),
  fixationStability: z.number().min(0).max(1),
  policyControlsEnabled: z.array(z.string().min(1))
});

const fallback = { minimumDwellMs: 400, minimumAttentionScore: 0.6, policyControls: ["ranking_hook_opt_in", "privacy_masking"] };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "gaze-attention-model.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateGazeAttention(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const attentionScore = Number((Math.min(1, parsed.data.dwellMs / policy.minimumDwellMs) * 0.5 + parsed.data.fixationStability * 0.5).toFixed(3));
  const controlsSatisfied = policy.policyControls.every((control) => parsed.data.policyControlsEnabled.includes(control));

  return {
    ok: true as const,
    attentionScore,
    attentionActive: attentionScore >= policy.minimumAttentionScore,
    controlsSatisfied,
    rankingHookAllowed: controlsSatisfied
  };
}
