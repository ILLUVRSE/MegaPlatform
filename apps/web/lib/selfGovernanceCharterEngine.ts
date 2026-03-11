import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ requiredPrinciples: z.array(z.string().min(1)).min(1), enforceHighImpactOnly: z.boolean() });
const requestSchema = z.object({ decisionId: z.string().min(1), impactLevel: z.enum(["low", "medium", "high"]), principles: z.array(z.string().min(1)) });
const fallback = { requiredPrinciples: ["safety", "accountability", "human_oversight"], enforceHighImpactOnly: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "self-governance-charter-engine.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function evaluateSelfGovernanceCharter(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const shouldEnforce = !p.enforceHighImpactOnly || parsed.data.impactLevel === "high";
  const missing = shouldEnforce ? p.requiredPrinciples.filter((principle) => !parsed.data.principles.includes(principle)) : [];
  return { ok: true as const, decisionId: parsed.data.decisionId, charterCompliant: missing.length === 0, missingPrinciples: missing, machineEvaluable: true };
}
