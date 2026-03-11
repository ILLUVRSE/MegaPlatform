import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minAbsoluteDelta: z.number().nonnegative(),
  maxHypothesesPerRun: z.number().int().positive(),
  defaultAgent: z.string().min(1)
});

const anomalySchema = z.object({
  signal: z.string().min(1),
  deltaRatio: z.number()
});

export type AnomalyInput = z.infer<typeof anomalySchema>;

const defaultPolicy = {
  minAbsoluteDelta: 0.1,
  maxHypothesesPerRun: 3,
  defaultAgent: "Quality/Analytics"
};

export async function loadHypothesisPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "hypothesis-generation.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = policySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function generateHypotheses(anomalies: AnomalyInput[]) {
  const policy = await loadHypothesisPolicy();
  const parsed = z.array(anomalySchema).safeParse(anomalies);
  if (!parsed.success) {
    return { policy, hypotheses: [] };
  }

  const filtered = parsed.data
    .filter((item) => Math.abs(item.deltaRatio) >= policy.minAbsoluteDelta)
    .slice(0, policy.maxHypothesesPerRun);

  const hypotheses = filtered.map((item, index): {
    id: string;
    signal: string;
    deltaRatio: number;
    confidence: number;
    risk: "low" | "medium" | "high";
    summary: string;
  } => {
    const confidence = Math.max(0.1, Math.min(0.95, 0.55 + Math.min(0.35, Math.abs(item.deltaRatio) / 2)));
    const risk = Math.abs(item.deltaRatio) >= 0.35 ? "high" : Math.abs(item.deltaRatio) >= 0.2 ? "medium" : "low";
    return {
      id: `hyp-${index + 1}-${item.signal.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      signal: item.signal,
      deltaRatio: item.deltaRatio,
      confidence,
      risk,
      summary: `Investigate ${item.signal} anomaly (${Math.round(item.deltaRatio * 100)}% delta).`
    };
  });

  return { policy, hypotheses };
}
