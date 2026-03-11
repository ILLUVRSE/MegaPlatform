import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  jitter: z.number().min(0),
  footSlip: z.number().min(0),
  poseError: z.number().min(0),
  gateContext: z.enum(["publish", "ci"])
});

const policySchema = z.object({
  maxJitter: z.number().min(0),
  maxFootSlip: z.number().min(0),
  maxPoseError: z.number().min(0)
});

const fallback = { maxJitter: 0.03, maxFootSlip: 0.02, maxPoseError: 0.04 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "animation-quality-gate-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateAnimationQualityGateV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const breaches = {
    jitter: parsed.data.jitter > policy.maxJitter,
    footSlip: parsed.data.footSlip > policy.maxFootSlip,
    poseError: parsed.data.poseError > policy.maxPoseError
  };

  return {
    ok: true as const,
    gateContext: parsed.data.gateContext,
    gatePassed: !breaches.jitter && !breaches.footSlip && !breaches.poseError,
    breaches,
    enforcedInCi: parsed.data.gateContext === "ci",
    enforcedOnPublish: parsed.data.gateContext === "publish"
  };
}
