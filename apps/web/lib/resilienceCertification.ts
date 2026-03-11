import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  requiredIncidentClasses: z.array(z.string().min(1)).min(1),
  minimumPassRate: z.number().min(0).max(1),
  requiredChecks: z.array(z.string().min(1)).min(1),
  maxCriticalFindings: z.number().int().nonnegative()
});

const payloadSchema = z.object({
  incidentClassesCovered: z.array(z.string().min(1)),
  checks: z.object({
    red_team: z.object({ passRate: z.number().min(0).max(1), criticalFindings: z.number().int().nonnegative() }),
    incident_replay: z.object({ passRate: z.number().min(0).max(1) }),
    region_sovereignty: z.object({ sovereign: z.boolean() })
  })
});

const defaultPolicy = {
  requiredIncidentClasses: ["service_outage", "security_event", "data_integrity"],
  minimumPassRate: 0.8,
  requiredChecks: ["red_team", "incident_replay", "region_sovereignty"],
  maxCriticalFindings: 0
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "resilience-certification-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateResilienceCertification(rawPayload: unknown) {
  const parsed = payloadSchema.safeParse(rawPayload);
  if (!parsed.success) return { ok: false as const, reason: "invalid_payload" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const missingClasses = policy.requiredIncidentClasses.filter(
    (incidentClass) => !parsed.data.incidentClassesCovered.includes(incidentClass)
  );

  const checks = parsed.data.checks;
  const passRate = Math.min(checks.red_team.passRate, checks.incident_replay.passRate);
  const criticalFindings = checks.red_team.criticalFindings;
  const sovereigntyPass = checks.region_sovereignty.sovereign;

  const blockers = [
    missingClasses.length > 0 ? "missing_incident_classes" : null,
    passRate < policy.minimumPassRate ? "pass_rate_below_threshold" : null,
    criticalFindings > policy.maxCriticalFindings ? "critical_findings_exceeded" : null,
    !sovereigntyPass ? "region_sovereignty_failed" : null
  ].filter((value): value is string => Boolean(value));

  return {
    ok: true as const,
    certified: blockers.length === 0,
    blockers,
    summary: {
      passRate,
      criticalFindings,
      missingClasses,
      sovereigntyPass
    }
  };
}
