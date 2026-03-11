import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxCarbonIntensityForImmediate: z.number().nonnegative(),
  eligiblePriorities: z.array(z.enum(["low", "medium", "high", "urgent"])),
  deferWindowMinutes: z.number().int().positive(),
  hardBlockAboveIntensity: z.number().nonnegative()
});

const requestSchema = z.object({
  jobId: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  carbonIntensity: z.number().nonnegative(),
  urgent: z.boolean().optional().default(false)
});

type CarbonPolicy = z.infer<typeof policySchema>;

const defaultPolicy: CarbonPolicy = {
  maxCarbonIntensityForImmediate: 280,
  eligiblePriorities: ["low", "medium"] as const,
  deferWindowMinutes: 90,
  hardBlockAboveIntensity: 500
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "carbon-aware-autonomy-scheduler.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

export async function scheduleCarbonAwareAutonomy(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  if (parsed.data.carbonIntensity > policy.hardBlockAboveIntensity && !parsed.data.urgent) {
    return { ok: true as const, jobId: parsed.data.jobId, decision: "blocked", reason: "carbon_hard_block", policy };
  }

  const eligibleForDeferral = policy.eligiblePriorities.includes(parsed.data.priority);
  const shouldDefer =
    eligibleForDeferral && parsed.data.carbonIntensity > policy.maxCarbonIntensityForImmediate && !parsed.data.urgent;

  return {
    ok: true as const,
    jobId: parsed.data.jobId,
    decision: shouldDefer ? "defer" : "run_now",
    deferMinutes: shouldDefer ? policy.deferWindowMinutes : 0,
    policy
  };
}
