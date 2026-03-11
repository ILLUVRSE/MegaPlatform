import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  baseSeverityThreshold: z.number().min(0).max(1),
  contextAmplifiers: z.record(z.string(), z.number().min(0).max(1)),
  escalateAbove: z.number().min(0).max(1),
  hardBlockAbove: z.number().min(0).max(1)
});

const requestSchema = z.object({
  baseSeverity: z.number().min(0).max(1),
  contextSignals: z.array(z.string().min(1)),
  eventId: z.string().min(1)
});

const defaultPolicy = {
  baseSeverityThreshold: 0.5,
  contextAmplifiers: {
    repeat_offense: 0.2,
    cross_surface_pattern: 0.15,
    targeted_harassment: 0.25,
    coordinated_behavior: 0.2
  },
  escalateAbove: 0.7,
  hardBlockAbove: 0.9
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "contextual-moderation-escalation.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateContextualModerationEscalation(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const amplification = parsed.data.contextSignals.reduce((sum, signal) => sum + (policy.contextAmplifiers[signal] ?? 0), 0);
  const effectiveSeverity = Math.min(1, parsed.data.baseSeverity + amplification);

  const decision =
    effectiveSeverity >= policy.hardBlockAbove
      ? "hard_block"
      : effectiveSeverity >= policy.escalateAbove
        ? "escalate"
        : effectiveSeverity >= policy.baseSeverityThreshold
          ? "review"
          : "allow";

  return {
    ok: true as const,
    decision,
    effectiveSeverity,
    contributingSignals: parsed.data.contextSignals.filter((signal) => policy.contextAmplifiers[signal] !== undefined)
  };
}
