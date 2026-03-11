import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { evaluatePolicyDecision } from "@/lib/policyEngine";

const scenarioSchema = z.object({
  id: z.string().min(1),
  scope: z.string().min(1),
  action: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()),
  expectedAllow: z.boolean(),
  control: z.string().min(1)
});

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

async function loadScenarios(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "governance-stress-tests.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(scenarioSchema).safeParse(parsed);
    if (!validated.success) return [];
    return validated.data;
  } catch {
    return [];
  }
}

export async function runGovernanceStressTests() {
  const root = await findRepoRoot();
  const scenarios = await loadScenarios(root);
  const results: Array<{
    id: string;
    control: string;
    expectedAllow: boolean;
    observedAllow: boolean;
    pass: boolean;
  }> = [];

  for (const scenario of scenarios) {
    const decision = await evaluatePolicyDecision({
      scope: scenario.scope,
      action: scenario.action,
      attributes: scenario.attributes
    });

    const observedAllow = decision.ok ? decision.allow : false;
    results.push({
      id: scenario.id,
      control: scenario.control,
      expectedAllow: scenario.expectedAllow,
      observedAllow,
      pass: observedAllow === scenario.expectedAllow
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    pass: results.every((result) => result.pass),
    total: results.length,
    failed: results.filter((result) => !result.pass).length,
    results
  };

  await fs.writeFile(path.join(root, "ops", "logs", "governance-stress-tests.json"), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  return report;
}

export async function readLatestGovernanceStressTestReport() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "logs", "governance-stress-tests.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
