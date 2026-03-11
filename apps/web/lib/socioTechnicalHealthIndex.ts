import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ minimumHealthyIndex: z.number().min(0).max(1), autonomyCapWhenUnhealthy: z.number().min(0).max(1) });
const requestSchema = z.object({ system: z.number().min(0).max(1), user: z.number().min(0).max(1), creator: z.number().min(0).max(1), operator: z.number().min(0).max(1), requestedAutonomyBound: z.number().min(0).max(1) });
const fallback = { minimumHealthyIndex: 0.65, autonomyCapWhenUnhealthy: 0.45 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "socio-technical-health-index.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function evaluateSocioTechnicalHealthIndex(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const index = Number(((parsed.data.system + parsed.data.user + parsed.data.creator + parsed.data.operator) / 4).toFixed(4));
  const healthy = index >= p.minimumHealthyIndex;
  const enforcedAutonomyBound = healthy ? parsed.data.requestedAutonomyBound : Math.min(parsed.data.requestedAutonomyBound, p.autonomyCapWhenUnhealthy);
  return { ok: true as const, index, healthy, enforcedAutonomyBound: Number(enforcedAutonomyBound.toFixed(4)) };
}
