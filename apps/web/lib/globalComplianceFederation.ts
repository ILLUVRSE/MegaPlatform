import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  regions: z.array(z.string().min(1)),
  defaultRegion: z.string().min(1),
  regionConstraints: z.record(z.array(z.string().min(1)))
});

const requestSchema = z.object({ actionId: z.string().min(1), region: z.string().min(1), controls: z.array(z.string().min(1)) });

const fallback = { regions: ["us"], defaultRegion: "us", regionConstraints: { us: ["ccpa"] } };

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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "global-compliance-federation.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateGlobalComplianceFederation(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();
  const region = policy.regions.includes(parsed.data.region) ? parsed.data.region : policy.defaultRegion;
  const required = policy.regionConstraints[region] ?? [];
  const missing = required.filter((c) => !parsed.data.controls.includes(c));
  return { ok: true as const, actionId: parsed.data.actionId, region, required, missing, compliant: missing.length === 0 };
}
