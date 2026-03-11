import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  defaultPermissions: z.array(z.string().min(1)).min(1),
  restrictedActions: z.array(z.string().min(1)).min(1),
  maxContracts: z.number().int().positive()
});

const contractSchema = z.object({
  creatorId: z.string().min(1),
  allowedActions: z.array(z.string().min(1)).min(1),
  deniedActions: z.array(z.string().min(1)),
  status: z.enum(["active", "suspended"])
});

const defaultPolicy = {
  outputPath: "ops/logs/creator-autonomy-contracts.json",
  defaultPermissions: ["publish", "schedule"],
  restrictedActions: ["rights_override", "license_bypass"],
  maxContracts: 10000
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "creator-autonomy-contracts.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readStore(root: string, outputPath: string) {
  try {
    const raw = await fs.readFile(path.join(root, outputPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.contracts)) return { contracts: [] as unknown[] };
    return parsed;
  } catch {
    return { contracts: [] as unknown[] };
  }
}

export async function upsertCreatorAutonomyContract(rawContract: unknown) {
  const parsed = contractSchema.safeParse(rawContract);
  if (!parsed.success) return { ok: false as const, reason: "invalid_contract" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const forbidden = parsed.data.allowedActions.filter((action) => policy.restrictedActions.includes(action));
  if (forbidden.length > 0) {
    return { ok: false as const, reason: "restricted_action_requested", forbidden };
  }

  const store = await readStore(root, policy.outputPath);
  const nextContracts = [
    parsed.data,
    ...store.contracts.filter((entry) => (entry as { creatorId?: string }).creatorId !== parsed.data.creatorId)
  ].slice(0, policy.maxContracts);

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify({ contracts: nextContracts }, null, 2)}\n`, "utf-8");

  return { ok: true as const, contract: parsed.data };
}

export async function evaluateCreatorActionPermission(creatorId: string, action: string) {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const store = await readStore(root, policy.outputPath);

  const contract = store.contracts.find((entry) => (entry as { creatorId?: string }).creatorId === creatorId) as
    | z.infer<typeof contractSchema>
    | undefined;

  const allowedActions = contract?.allowedActions ?? policy.defaultPermissions;
  const deniedActions = new Set(contract?.deniedActions ?? []);

  const allowed = allowedActions.includes(action) && !deniedActions.has(action) && !policy.restrictedActions.includes(action);

  return { allowed, contractStatus: contract?.status ?? "active" };
}
