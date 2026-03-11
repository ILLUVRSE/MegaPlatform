import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  requiredChecks: z.array(z.string().min(1)),
  minimumPassRatio: z.number().min(0).max(1),
  evidenceOutputPath: z.string().min(1)
});

const requestSchema = z.object({
  checkResults: z.record(z.boolean())
});

const defaultPolicy = {
  requiredChecks: ["budget_controls", "roi_controls", "fraud_controls", "audit_evidence"],
  minimumPassRatio: 1,
  evidenceOutputPath: "ops/logs/financial-governance-certification-v1.json"
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

async function loadPolicy() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "financial-governance-certification-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

async function writeEvidence(root: string, outputPath: string, run: Record<string, unknown>) {
  const fullPath = path.join(root, outputPath);
  const current = await fs.readFile(fullPath, "utf-8").then((raw) => JSON.parse(raw) as { runs?: unknown[] }).catch(() => ({ runs: [] }));
  const runs = Array.isArray(current.runs) ? current.runs : [];
  await fs.writeFile(fullPath, `${JSON.stringify({ runs: [run, ...runs].slice(0, 100) }, null, 2)}\n`, "utf-8");
}

export async function certifyFinancialGovernanceV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const root = await findRepoRoot();
  const policy = await loadPolicy();

  const required = policy.requiredChecks;
  const passed = required.filter((key) => parsed.data.checkResults[key] === true);
  const passRatio = required.length === 0 ? 1 : passed.length / required.length;
  const certified = passRatio >= policy.minimumPassRatio;

  const run = { certified, passRatio, requiredChecks: required, passedChecks: passed, generatedAt: new Date().toISOString() };
  await writeEvidence(root, policy.evidenceOutputPath, run);

  return { ok: true as const, ...run, policy };
}
