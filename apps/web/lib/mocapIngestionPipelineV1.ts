import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  sourceFormat: z.string().min(1),
  sampleCount: z.number().int().positive(),
  transformProfile: z.string().min(1)
});

const policySchema = z.object({
  supportedFormats: z.array(z.string().min(1)).min(1),
  maxSamples: z.number().int().positive(),
  requiredTransformProfiles: z.array(z.string().min(1)).min(1)
});

const fallback = {
  supportedFormats: ["fbx", "bvh", "c3d"],
  maxSamples: 200000,
  requiredTransformProfiles: ["humanoid", "quadruped"]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "mocap-ingestion-pipeline-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

function stableOutputId(sourceFormat: string, sampleCount: number, transformProfile: string) {
  return `${sourceFormat}:${sampleCount}:${transformProfile}`;
}

export async function evaluateMocapIngestionPipelineV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const formatValid = policy.supportedFormats.includes(parsed.data.sourceFormat);
  const sampleBudgetValid = parsed.data.sampleCount <= policy.maxSamples;
  const transformValid = policy.requiredTransformProfiles.includes(parsed.data.transformProfile);

  return {
    ok: true as const,
    ingestionValid: formatValid && sampleBudgetValid && transformValid,
    deterministicOutputId: stableOutputId(parsed.data.sourceFormat, parsed.data.sampleCount, parsed.data.transformProfile),
    transformed: transformValid,
    stored: formatValid && sampleBudgetValid
  };
}
