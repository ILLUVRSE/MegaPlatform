import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  assembled: z.boolean(),
  previewReady: z.boolean(),
  validationReady: z.boolean(),
  previewStartupMs: z.number().nonnegative()
});

const policySchema = z.object({
  requireUnifiedFlow: z.boolean(),
  maxPreviewStartupMs: z.number().nonnegative()
});

const fallback = { requireUnifiedFlow: true, maxPreviewStartupMs: 2000 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-creator-workspace-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateXrCreatorWorkspaceV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const unifiedFlowMet = !policy.requireUnifiedFlow || (parsed.data.assembled && parsed.data.previewReady && parsed.data.validationReady);
  const previewPerformanceMet = parsed.data.previewStartupMs <= policy.maxPreviewStartupMs;

  return {
    ok: true as const,
    workspaceReady: unifiedFlowMet && previewPerformanceMet,
    unifiedFlowMet,
    previewPerformanceMet
  };
}
