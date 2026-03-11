import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const reviewPolicySchema = z.object({
  minSuccessRate: z.number().min(0).max(1),
  maxErrorRate: z.number().min(0).max(1),
  maxP95LatencyMs: z.number().int().positive(),
  overrideRunbookPath: z.string().min(1)
});

const loopRunSchema = z.object({
  runId: z.string().min(1),
  successRate: z.number().min(0).max(1),
  errorRate: z.number().min(0).max(1),
  p95LatencyMs: z.number().nonnegative()
});

const defaultPolicy = {
  minSuccessRate: 0.92,
  maxErrorRate: 0.05,
  maxP95LatencyMs: 2000,
  overrideRunbookPath: "docs/ops_brain/runbooks/stuck-tasks.md"
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function loadLoopReviewPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "autonomous-loop-review.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = reviewPolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function buildAutonomousLoopReliabilityReview() {
  const policy = await loadLoopReviewPolicy();
  const logPath = path.join(process.cwd(), "ops", "logs", "autonomous-loop-runs.json");
  let runs: z.infer<typeof loopRunSchema>[] = [];
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(loopRunSchema).safeParse(parsed);
    if (validated.success) runs = validated.data;
  } catch {
    runs = [];
  }

  const latest = runs.at(-1) ?? null;
  const checks = latest
    ? [
        { key: "success_rate", pass: latest.successRate >= policy.minSuccessRate, observed: latest.successRate },
        { key: "error_rate", pass: latest.errorRate <= policy.maxErrorRate, observed: latest.errorRate },
        { key: "p95_latency_ms", pass: latest.p95LatencyMs <= policy.maxP95LatencyMs, observed: latest.p95LatencyMs }
      ]
    : [
        { key: "success_rate", pass: false, observed: null },
        { key: "error_rate", pass: false, observed: null },
        { key: "p95_latency_ms", pass: false, observed: null }
      ];

  const overrideRunbookExists = await exists(path.join(process.cwd(), policy.overrideRunbookPath));
  const pass = checks.every((item) => item.pass) && overrideRunbookExists;

  return {
    policy,
    latest,
    checks,
    overrideRunbookExists,
    pass,
    generatedAt: new Date().toISOString()
  };
}
