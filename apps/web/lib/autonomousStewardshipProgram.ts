import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ requiredResponsibilities: z.array(z.string().min(1)).min(1), cadenceDays: z.number().int().min(1), requiredControls: z.array(z.string().min(1)).min(1) });
const requestSchema = z.object({ responsibilities: z.array(z.string().min(1)), controls: z.array(z.string().min(1)), cadenceDays: z.number().int().min(1) });
const fallback = { requiredResponsibilities: ["policy_review", "incident_review", "ethics_review"], cadenceDays: 30, requiredControls: ["audit_log", "approval_gate"] };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "autonomous-stewardship-program.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function evaluateAutonomousStewardshipProgram(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const missingResponsibilities = p.requiredResponsibilities.filter((item) => !parsed.data.responsibilities.includes(item));
  const missingControls = p.requiredControls.filter((item) => !parsed.data.controls.includes(item));
  const cadenceOk = parsed.data.cadenceDays <= p.cadenceDays;
  return { ok: true as const, operationalized: missingResponsibilities.length === 0 && missingControls.length === 0 && cadenceOk, missingResponsibilities, missingControls, cadenceOk };
}
