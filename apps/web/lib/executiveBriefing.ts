import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { buildGovernanceDriftReport } from "@/lib/governanceDrift";
import { buildAutonomousLoopReliabilityReview } from "@/lib/autonomousLoopReview";

const policySchema = z.object({
  requiredSections: z.array(z.enum(["summary", "risks", "wins", "blockers", "nextActions"])).min(1),
  maxItemsPerSection: z.number().int().positive(),
  riskSeverityThreshold: z.enum(["warning", "critical"])
});

const defaultPolicy = {
  requiredSections: ["summary", "risks", "wins", "blockers", "nextActions"] as const,
  maxItemsPerSection: 5,
  riskSeverityThreshold: "warning" as const
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "executive-briefing.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function writeBriefing(root: string, payload: unknown) {
  const target = path.join(root, "docs", "ops_brain", "briefings", "latest.json");
  await fs.writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export async function buildExecutiveBriefing() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const drift = await buildGovernanceDriftReport();
  const loopReview = await buildAutonomousLoopReliabilityReview();

  const risks = [
    ...drift.driftSignals
      .filter((signal) => policy.riskSeverityThreshold === "warning" || signal.severity === "critical")
      .map((signal) => `Policy drift on ${signal.scope}.${signal.action}: ${signal.remediation}`),
    ...loopReview.checks.filter((check) => !check.pass).map((check) => `Loop reliability check failing: ${check.key}`)
  ].slice(0, policy.maxItemsPerSection);

  const wins = [
    drift.hasDrift ? "Drift monitor active with remediation guidance" : "No governance drift detected",
    loopReview.pass ? "Autonomous loop reliability passing" : "Loop review generated actionable failure details"
  ].slice(0, policy.maxItemsPerSection);

  const blockers = risks.map((risk) => `Blocker: ${risk}`).slice(0, policy.maxItemsPerSection);
  const nextActions = [
    "review critical drift items in governance dashboard",
    "assign owner for unresolved reliability checks",
    "confirm approval checkpoints for high-risk actions"
  ].slice(0, policy.maxItemsPerSection);

  const briefing = {
    generatedAt: new Date().toISOString(),
    summary: `Governance status: ${drift.hasDrift ? "drift detected" : "stable"}; Loop review: ${loopReview.pass ? "pass" : "attention required"}`,
    risks,
    wins,
    blockers,
    nextActions,
    sources: {
      driftGeneratedAt: drift.generatedAt,
      loopReviewGeneratedAt: loopReview.generatedAt
    }
  };

  await writeBriefing(root, briefing);
  return briefing;
}

export async function readLatestExecutiveBriefing() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "docs", "ops_brain", "briefings", "latest.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
