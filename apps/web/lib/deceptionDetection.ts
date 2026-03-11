import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  riskThreshold: z.number().min(0).max(1),
  weightedSignals: z.record(z.string(), z.number().min(0).max(1)),
  autoEscalateAbove: z.number().min(0).max(1)
});

const requestSchema = z.object({
  signals: z.record(z.string(), z.number().min(0).max(1))
});

const defaultPolicy = {
  riskThreshold: 0.65,
  weightedSignals: {
    instruction_override: 0.35,
    identity_spoofing: 0.3,
    tool_chain_diversion: 0.25,
    coercive_language: 0.1
  },
  autoEscalateAbove: 0.8
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "deception-manipulation-detection.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function detectDeceptionManipulation(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const contributions = Object.entries(policy.weightedSignals).map(([signal, weight]) => {
    const value = parsed.data.signals[signal] ?? 0;
    return {
      signal,
      value,
      weight,
      contribution: value * weight
    };
  });

  const riskScore = contributions.reduce((sum, item) => sum + item.contribution, 0);
  const flagged = riskScore >= policy.riskThreshold;

  return {
    ok: true as const,
    riskScore,
    flagged,
    escalationRequired: riskScore >= policy.autoEscalateAbove,
    topSignals: contributions
      .slice()
      .sort((left, right) => right.contribution - left.contribution)
      .slice(0, 3)
  };
}
