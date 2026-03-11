import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ minimumCompliantOutcomeRate: z.number().min(0).max(1), requiredStewardshipControls: z.array(z.string().min(1)).min(1), minimumObservationWindows: z.number().int().min(1) });
const requestSchema = z.object({
  outcomeWindows: z.array(z.object({ compliantRuns: z.number().int().min(0), totalRuns: z.number().int().min(1) })).min(1),
  activeStewardshipControls: z.array(z.string().min(1))
});
const fallback = { minimumCompliantOutcomeRate: 0.9, requiredStewardshipControls: ["audit_log", "approval_gate", "human_review"], minimumObservationWindows: 3 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "organism-mode-v3-stewarded-intelligence-fabric.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function evaluateOrganismModeV3(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const totalCompliant = parsed.data.outcomeWindows.reduce((sum, row) => sum + row.compliantRuns, 0);
  const totalRuns = parsed.data.outcomeWindows.reduce((sum, row) => sum + row.totalRuns, 0);
  const compliantOutcomeRate = totalRuns > 0 ? Number((totalCompliant / totalRuns).toFixed(4)) : 0;
  const windowsOk = parsed.data.outcomeWindows.length >= p.minimumObservationWindows;
  const missingControls = p.requiredStewardshipControls.filter((control) => !parsed.data.activeStewardshipControls.includes(control));
  const sustainCompliantOutcomes = compliantOutcomeRate >= p.minimumCompliantOutcomeRate && windowsOk && missingControls.length === 0;
  return { ok: true as const, sustainCompliantOutcomes, compliantOutcomeRate, windowsOk, missingStewardshipControls: missingControls, verifiedStewardshipControls: missingControls.length === 0 };
}
