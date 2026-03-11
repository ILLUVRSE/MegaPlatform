import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ confidenceThreshold: z.number().min(0).max(1), riskThreshold: z.number().min(0).max(1), baseAutonomyBound: z.number().min(0).max(1) });
const requestSchema = z.object({ confidence: z.number().min(0).max(1), risk: z.number().min(0).max(1) });
const fallback = { confidenceThreshold: 0.7, riskThreshold: 0.4, baseAutonomyBound: 0.6 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "organism-mode-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function evaluateOrganismModeV2(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();

  let adaptiveBound = p.baseAutonomyBound;
  if (parsed.data.confidence >= p.confidenceThreshold) adaptiveBound += 0.2;
  if (parsed.data.risk > p.riskThreshold) adaptiveBound -= 0.3;
  adaptiveBound = Math.max(0, Math.min(1, Number(adaptiveBound.toFixed(4))));

  return { ok: true as const, adaptiveAutonomyBound: adaptiveBound, confidence: parsed.data.confidence, risk: parsed.data.risk };
}
