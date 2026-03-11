import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const guardrailSchema = z.object({
  metricKey: z.string().min(1),
  maxRegressionRatio: z.number().min(0),
  autoRollback: z.boolean()
});

const defaultGuardrails = [
  { metricKey: "watch_completion_rate", maxRegressionRatio: 0.08, autoRollback: true },
  { metricKey: "feed_report_rate", maxRegressionRatio: 0.1, autoRollback: true },
  { metricKey: "studio_failed_jobs_24h_rate", maxRegressionRatio: 0.05, autoRollback: true }
];

export async function loadRolloutGuardrails() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "rollout-guardrails.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(guardrailSchema).safeParse(parsed);
    if (!result.success) return defaultGuardrails;
    return result.data;
  } catch {
    return defaultGuardrails;
  }
}

export async function evaluateRolloutGuardrails(metrics: Array<{ metricKey: string; regressionRatio: number }>) {
  const guardrails = await loadRolloutGuardrails();
  const byMetric = new Map(metrics.map((item) => [item.metricKey, item.regressionRatio]));

  const evaluations = guardrails.map((guardrail) => {
    const observed = byMetric.get(guardrail.metricKey) ?? 0;
    const pass = observed <= guardrail.maxRegressionRatio;
    return {
      ...guardrail,
      observed,
      pass,
      rollbackTriggered: !pass && guardrail.autoRollback
    };
  });

  return {
    evaluations,
    rollbackTriggered: evaluations.some((item) => item.rollbackTriggered),
    blockers: evaluations.filter((item) => !item.pass),
    generatedAt: new Date().toISOString()
  };
}
