import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  allowedStates: z.array(z.string().min(1)).min(1),
  initialState: z.string().min(1),
  maxOpenDisputes: z.number().int().positive()
});

const disputeSchema = z.object({
  disputeId: z.string().min(1),
  claimantId: z.string().min(1),
  subjectId: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  state: z.string().min(1).optional()
});

const defaultPolicy = {
  outputPath: "ops/logs/dispute-resolution-automation.json",
  allowedStates: ["intake", "investigating", "resolved", "rejected"],
  initialState: "intake",
  maxOpenDisputes: 5000
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "dispute-resolution-automation.json"), "utf-8");
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
    if (!parsed || !Array.isArray(parsed.disputes)) return { disputes: [] as unknown[] };
    return parsed;
  } catch {
    return { disputes: [] as unknown[] };
  }
}

export async function upsertDispute(rawDispute: unknown) {
  const parsed = disputeSchema.safeParse(rawDispute);
  if (!parsed.success) return { ok: false as const, reason: "invalid_dispute" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const store = await readStore(root, policy.outputPath);

  const state = parsed.data.state ?? policy.initialState;
  if (!policy.allowedStates.includes(state)) {
    return { ok: false as const, reason: "invalid_state" };
  }

  const openDisputes = store.disputes.filter((entry) => {
    const value = entry as { state?: string };
    return value.state !== "resolved" && value.state !== "rejected";
  }).length;

  if (openDisputes >= policy.maxOpenDisputes && state === policy.initialState) {
    return { ok: false as const, reason: "open_dispute_limit_reached" };
  }

  const nextDisputes = [
    { ...parsed.data, state },
    ...store.disputes.filter((entry) => (entry as { disputeId?: string }).disputeId !== parsed.data.disputeId)
  ];

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify({ disputes: nextDisputes }, null, 2)}\n`, "utf-8");

  return { ok: true as const, dispute: { ...parsed.data, state } };
}

export async function listDisputes() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  return readStore(root, policy.outputPath);
}
