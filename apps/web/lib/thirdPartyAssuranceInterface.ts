import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ allowedAssessors: z.array(z.string().min(1)).min(1), allowedArtifacts: z.array(z.string().min(1)).min(1), redactSensitive: z.boolean() });
const requestSchema = z.object({ assessorId: z.string().min(1), artifactType: z.enum(["certification", "evidence"]), artifactId: z.string().min(1) });
const fallback = { allowedAssessors: ["external_auditor", "regulator_partner"], allowedArtifacts: ["certification", "evidence"], redactSensitive: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "third-party-assurance-interface.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function queryThirdPartyAssurance(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const p = await loadPolicy();
  if (!p.allowedAssessors.includes(parsed.data.assessorId)) return { ok: false as const, reason: "assessor_not_allowed" };
  if (!p.allowedArtifacts.includes(parsed.data.artifactType)) return { ok: false as const, reason: "artifact_not_allowed" };
  return { ok: true as const, response: { artifactId: parsed.data.artifactId, artifactType: parsed.data.artifactType, redacted: p.redactSensitive, safeAccess: true } };
}
