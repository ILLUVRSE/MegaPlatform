import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ defaultSlaHours: z.number().int().min(1), highImpactSlaHours: z.number().int().min(1), reviewPools: z.array(z.string().min(1)).min(1) });
const requestSchema = z.object({ decisionId: z.string().min(1), impactLevel: z.enum(["low", "medium", "high"]), domain: z.enum(["safety", "legal", "ops"]) });
const fallback = { defaultSlaHours: 24, highImpactSlaHours: 4, reviewPools: ["safety_board", "legal_review", "ops_command"] };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "human-oversight-marketplaces.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function assignHumanOversight(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const pool = parsed.data.domain === "safety" ? p.reviewPools[0] : parsed.data.domain === "legal" ? p.reviewPools[1] : p.reviewPools[2];
  const slaHours = parsed.data.impactLevel === "high" ? p.highImpactSlaHours : p.defaultSlaHours;
  return { ok: true as const, assignment: { decisionId: parsed.data.decisionId, reviewPool: pool, slaHours, traceable: true } };
}
