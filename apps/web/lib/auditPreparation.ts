import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  bundleName: z.string().min(1),
  requiredEvidence: z.array(z.string().min(1)).min(1)
});

const defaultPolicy = {
  bundleName: "governance-audit-core",
  requiredEvidence: ["docs/compliance/privacy-retention.md"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomous-audit-prep.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function buildAutonomousAuditBundle() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const evidence = await Promise.all(
    policy.requiredEvidence.map(async (relativePath) => {
      const fullPath = path.join(root, relativePath);
      const present = await exists(fullPath);
      return {
        path: relativePath,
        present
      };
    })
  );

  const missing = evidence.filter((item) => !item.present);
  const bundle = {
    generatedAt: new Date().toISOString(),
    bundleName: policy.bundleName,
    status: missing.length === 0 ? "ready" : "incomplete",
    evidence,
    missingCount: missing.length
  };

  await fs.writeFile(path.join(root, "docs", "compliance", "evidence", "audit-bundle-latest.json"), `${JSON.stringify(bundle, null, 2)}\n`, "utf-8");
  return bundle;
}

export async function readLatestAutonomousAuditBundle() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "docs", "compliance", "evidence", "audit-bundle-latest.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
