import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  noveltyThreshold: z.number().min(0).max(1),
  riskThreshold: z.number().min(0).max(1),
  opportunityThreshold: z.number().min(0).max(1)
});

const eventSchema = z.object({
  id: z.string().min(1),
  signal: z.string().min(1),
  novelty: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  impact: z.number().min(0).max(1)
});

const defaultPolicy = {
  noveltyThreshold: 0.7,
  riskThreshold: 0.6,
  opportunityThreshold: 0.65
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "emergent-behavior-monitoring.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function classifyEmergentBehavior(rawEvents: unknown) {
  const parsed = z.array(eventSchema).safeParse(rawEvents);
  if (!parsed.success) return { ok: false as const, reason: "invalid_events" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const classified = parsed.data.map((event) => {
    const isEmergent = event.novelty >= policy.noveltyThreshold;
    const category =
      event.risk >= policy.riskThreshold
        ? "risk"
        : event.impact >= policy.opportunityThreshold
          ? "opportunity"
          : "observe";

    return {
      ...event,
      emergent: isEmergent,
      category,
      recommendedAction: category === "risk" ? "constrain" : category === "opportunity" ? "explore" : "monitor"
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    events: classified
  };

  await fs.writeFile(path.join(root, "ops", "logs", "emergent-behaviors.json"), `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  return {
    ok: true as const,
    report
  };
}

export async function readEmergentBehaviorReport() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "logs", "emergent-behaviors.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
