import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ requiredInvariants: z.array(z.string().min(1)).min(1), failClosed: z.boolean() });
const requestSchema = z.object({
  decisionId: z.string().min(1),
  satisfiedInvariants: z.array(z.string().min(1))
});
const fallback = { requiredInvariants: ["human_oversight", "non_maleficence"], failClosed: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "autonomous-constitutional-tests.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function runAutonomousConstitutionalTests(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const failed = p.requiredInvariants.filter((invariant) => !parsed.data.satisfiedInvariants.includes(invariant));
  const pass = failed.length === 0;
  return { ok: true as const, decisionId: parsed.data.decisionId, pass, failedInvariants: failed, executionGate: pass ? "allow" : p.failClosed ? "block" : "review" };
}
