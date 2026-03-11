import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minimumSessionUptime: z.number().min(0).max(1),
  maximumSyncLossRate: z.number().min(0).max(1),
  alertSurfaces: z.array(z.string().min(1)).min(1)
});

const requestSchema = z.object({ sessionUptime: z.number().min(0).max(1), syncLossRate: z.number().min(0).max(1) });

const fallback = { minimumSessionUptime: 0.995, maximumSyncLossRate: 0.01, alertSurfaces: ["admin_dashboard", "incident_channel"] };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "presence-reliability-slos.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluatePresenceReliabilitySLOs(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const uptimeBreach = parsed.data.sessionUptime < policy.minimumSessionUptime;
  const syncLossBreach = parsed.data.syncLossRate > policy.maximumSyncLossRate;

  return {
    ok: true as const,
    slosMet: !uptimeBreach && !syncLossBreach,
    breaches: {
      uptimeBreach,
      syncLossBreach
    },
    alertSurfaces: policy.alertSurfaces,
    alertRequired: uptimeBreach || syncLossBreach
  };
}
