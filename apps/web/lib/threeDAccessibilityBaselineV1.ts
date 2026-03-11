import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  captionsEnabled: z.boolean(),
  highContrastUiEnabled: z.boolean(),
  seatedModeSupported: z.boolean(),
  oneHandedInputSupported: z.boolean(),
  assistiveAudioCuesEnabled: z.boolean(),
  baselineScore: z.number().min(0).max(1)
});

const policySchema = z.object({
  requireCaptions: z.boolean(),
  requireHighContrastUi: z.boolean(),
  requireSeatedModeSupport: z.boolean(),
  requireOneHandedInputSupport: z.boolean(),
  requireAssistiveAudioCues: z.boolean(),
  minimumBaselineScore: z.number().min(0).max(1)
});

const fallback = {
  requireCaptions: true,
  requireHighContrastUi: true,
  requireSeatedModeSupport: true,
  requireOneHandedInputSupport: true,
  requireAssistiveAudioCues: true,
  minimumBaselineScore: 0.95
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "3d-accessibility-baseline-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateThreeDAccessibilityBaselineV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const captionsCompliant = !policy.requireCaptions || parsed.data.captionsEnabled;
  const highContrastCompliant = !policy.requireHighContrastUi || parsed.data.highContrastUiEnabled;
  const seatedModeCompliant = !policy.requireSeatedModeSupport || parsed.data.seatedModeSupported;
  const oneHandedInputCompliant = !policy.requireOneHandedInputSupport || parsed.data.oneHandedInputSupported;
  const assistiveAudioCompliant = !policy.requireAssistiveAudioCues || parsed.data.assistiveAudioCuesEnabled;
  const scoreCompliant = parsed.data.baselineScore >= policy.minimumBaselineScore;

  return {
    ok: true as const,
    baselinePassing:
      captionsCompliant &&
      highContrastCompliant &&
      seatedModeCompliant &&
      oneHandedInputCompliant &&
      assistiveAudioCompliant &&
      scoreCompliant,
    captionsCompliant,
    highContrastCompliant,
    seatedModeCompliant,
    oneHandedInputCompliant,
    assistiveAudioCompliant,
    scoreCompliant
  };
}
