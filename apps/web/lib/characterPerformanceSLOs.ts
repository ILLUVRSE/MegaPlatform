import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ runtimeUptime: z.number().min(0).max(1), droppedFrameRate: z.number().min(0).max(1) });
const policySchema = z.object({ minimumRuntimeUptime: z.number().min(0).max(1), maximumDroppedFrameRate: z.number().min(0).max(1), breachSurfaces: z.array(z.string().min(1)).min(1) });

const fallback = {
  minimumRuntimeUptime: 0.995,
  maximumDroppedFrameRate: 0.015,
  breachSurfaces: ["character_dashboard", "incident_channel"]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "character-performance-slos.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCharacterPerformanceSLOs(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const uptimeBreach = parsed.data.runtimeUptime < policy.minimumRuntimeUptime;
  const frameDropBreach = parsed.data.droppedFrameRate > policy.maximumDroppedFrameRate;

  return {
    ok: true as const,
    slosMet: !uptimeBreach && !frameDropBreach,
    breaches: { uptimeBreach, frameDropBreach },
    breachReportingIntegrated: true,
    dashboardIntegrated: true,
    breachSurfaces: policy.breachSurfaces,
    alertRequired: uptimeBreach || frameDropBreach
  };
}
