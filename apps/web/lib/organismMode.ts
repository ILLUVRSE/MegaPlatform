import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { buildAutonomousMaturityCertification } from "@/lib/autonomousMaturity";
import { buildTrustworthyAiOperationsScore } from "@/lib/trustworthyAiScore";

const policySchema = z.object({
  requireMaturityCertification: z.boolean(),
  blockedActionLimits: z.array(z.enum(["normal", "restricted", "halted"])),
  requiredBriefingPath: z.string().min(1)
});

const defaultPolicy = {
  requireMaturityCertification: true,
  blockedActionLimits: ["halted"],
  requiredBriefingPath: "docs/ops_brain/briefings/latest.json"
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "organism-mode-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function persistStatus(root: string, status: unknown) {
  await fs.writeFile(path.join(root, "ops", "logs", "organism-mode-status.json"), `${JSON.stringify(status, null, 2)}\n`, "utf-8");
}

export async function evaluateOrganismModeActivation() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const maturity = await buildAutonomousMaturityCertification();
  const trust = await buildTrustworthyAiOperationsScore();
  const briefingExists = await exists(path.join(root, policy.requiredBriefingPath));

  const blockedByMaturity = policy.requireMaturityCertification && !maturity.certified;
  const blockedByActionLimit = policy.blockedActionLimits.includes(trust.actionLimit);
  const blockedByBriefing = !briefingExists;

  const active = !(blockedByMaturity || blockedByActionLimit || blockedByBriefing);
  const reasons = [] as string[];
  if (blockedByMaturity) reasons.push("maturity_not_certified");
  if (blockedByActionLimit) reasons.push(`action_limit_${trust.actionLimit}`);
  if (blockedByBriefing) reasons.push("missing_daily_briefing");

  const status = {
    active,
    lastEvaluatedAt: new Date().toISOString(),
    reason: reasons.length > 0 ? reasons.join(",") : "ready",
    maturityScore: maturity.score,
    actionLimit: trust.actionLimit,
    briefingPath: policy.requiredBriefingPath
  };

  await persistStatus(root, status);
  return status;
}

export async function readOrganismModeStatus() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "logs", "organism-mode-status.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
