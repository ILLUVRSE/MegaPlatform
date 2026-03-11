import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ requiredMetrics: z.array(z.string().min(1)).min(1), requireEvidenceLinks: z.boolean() });
const requestSchema = z.object({
  metrics: z.record(z.string(), z.number()),
  evidenceLinks: z.array(z.string().min(1))
});
const fallback = { requiredMetrics: ["autonomy_success_rate", "policy_breach_rate"], requireEvidenceLinks: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "open-autonomy-transparency-portal.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function generateTransparencySnapshot(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const missingMetrics = p.requiredMetrics.filter((metric) => typeof parsed.data.metrics[metric] !== "number");
  const evidenceOk = !p.requireEvidenceLinks || parsed.data.evidenceLinks.length > 0;
  if (missingMetrics.length > 0 || !evidenceOk) return { ok: false as const, reason: "incomplete_snapshot" };
  return { ok: true as const, snapshot: { metrics: parsed.data.metrics, evidenceLinks: parsed.data.evidenceLinks, exposed: true } };
}
