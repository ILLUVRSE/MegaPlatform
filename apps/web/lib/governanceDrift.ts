import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxMismatchRatio: z.number().min(0).max(1),
  minSampleSize: z.number().int().positive(),
  defaultSeverity: z.enum(["warning", "critical"]),
  escalateSeverityAt: z.number().min(0).max(1)
});

const sampleSchema = z.object({
  scope: z.string().min(1),
  action: z.string().min(1),
  expectedEffect: z.enum(["allow", "deny"]),
  observedEffect: z.enum(["allow", "deny"]),
  sampleCount: z.number().int().positive()
});

const defaultPolicy = {
  maxMismatchRatio: 0.1,
  minSampleSize: 10,
  defaultSeverity: "warning" as const,
  escalateSeverityAt: 0.25
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
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadDriftPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "governance-drift-monitor.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function loadDecisionSamples(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "logs", "policy-decision-samples.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(sampleSchema).safeParse(parsed);
    if (!validated.success) return [];
    return validated.data;
  } catch {
    return [];
  }
}

function buildRemediationProposal(sample: z.infer<typeof sampleSchema>) {
  if (sample.expectedEffect === "deny" && sample.observedEffect === "allow") {
    return "tighten execution guardrails or add explicit deny precedence rule";
  }
  if (sample.expectedEffect === "allow" && sample.observedEffect === "deny") {
    return "review policy condition strictness and update allow rule predicates";
  }
  return "no remediation required";
}

export async function buildGovernanceDriftReport() {
  const root = await findRepoRoot();
  const policy = await loadDriftPolicy(root);
  const samples = await loadDecisionSamples(root);

  const totalSamples = samples.reduce((sum, sample) => sum + sample.sampleCount, 0);
  const driftSignals = samples
    .filter((sample) => sample.expectedEffect !== sample.observedEffect)
    .map((sample) => ({
      ...sample,
      mismatchRatio: totalSamples > 0 ? sample.sampleCount / totalSamples : 0
    }))
    .filter((signal) => signal.sampleCount >= policy.minSampleSize || signal.mismatchRatio >= policy.maxMismatchRatio)
    .map((signal) => ({
      ...signal,
      severity: signal.mismatchRatio >= policy.escalateSeverityAt ? "critical" : policy.defaultSeverity,
      remediation: buildRemediationProposal(signal)
    }));

  return {
    policy,
    totalSamples,
    driftSignals,
    hasDrift: driftSignals.length > 0,
    generatedAt: new Date().toISOString()
  };
}
