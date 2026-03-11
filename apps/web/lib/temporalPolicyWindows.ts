import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const windowSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  decision: z.enum(["allow", "deny", "require_approval"])
});

const policySchema = z.object({
  timezone: z.string().min(1),
  defaultDecision: z.enum(["allow", "deny", "require_approval"]),
  windows: z.array(windowSchema)
});

const requestSchema = z.object({
  domain: z.string().min(1),
  atIso: z.string().datetime().optional()
});

const defaultPolicy = {
  timezone: "UTC",
  defaultDecision: "deny" as const,
  windows: []
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "temporal-policy-windows.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateTemporalPolicyWindow(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const at = parsed.data.atIso ? new Date(parsed.data.atIso) : new Date();
  const day = at.getUTCDay();
  const hour = at.getUTCHours();

  const matchingWindow = policy.windows
    .filter((window) => window.domain === parsed.data.domain && window.days.includes(day))
    .sort((left, right) => left.startHour - right.startHour)
    .find((window) => hour >= window.startHour && hour < window.endHour);

  const decision = matchingWindow ? matchingWindow.decision : policy.defaultDecision;

  return {
    ok: true as const,
    domain: parsed.data.domain,
    decision,
    matchedWindowId: matchingWindow?.id ?? null,
    evaluatedAt: at.toISOString(),
    timezone: policy.timezone
  };
}
