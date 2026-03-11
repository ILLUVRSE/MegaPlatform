import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ minimumIncidentSeverity: z.number().min(0).max(1), requireValidation: z.boolean() });
const requestSchema = z.object({ incidents: z.array(z.object({ id: z.string().min(1), severity: z.number().min(0).max(1), lesson: z.string().min(1), validated: z.boolean() })).min(1) });
const fallback = { minimumIncidentSeverity: 0.5, requireValidation: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "ecosystem-antifragility-loop.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function runEcosystemAntifragilityLoop(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  const upgrades = parsed.data.incidents
    .filter((incident) => incident.severity >= p.minimumIncidentSeverity)
    .filter((incident) => !p.requireValidation || incident.validated)
    .map((incident) => ({ incidentId: incident.id, resilienceUpgrade: incident.lesson, validated: incident.validated }));
  return { ok: true as const, upgrades };
}
