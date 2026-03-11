import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const edgePolicySchema = z.object({
  defaultPop: z.string().min(1),
  regionToPop: z.record(z.string(), z.string().min(1)),
  latencyBudgetsMs: z
    .array(
      z.object({
        modulePrefix: z.string().min(1),
        maxP95LatencyMs: z.number().positive()
      })
    )
    .min(1)
});

const snapshotSchema = z.object({
  modulePath: z.string().min(1),
  region: z.string().min(1),
  p95LatencyMs: z.number().nonnegative(),
  requestCount: z.number().int().nonnegative()
});

const defaultPolicy = {
  defaultPop: "us-east",
  regionToPop: {
    US: "us-east"
  },
  latencyBudgetsMs: [
    { modulePrefix: "/watch", maxP95LatencyMs: 220 }
  ]
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
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function readJsonArray<T>(filePath: string, schema: z.ZodType<T>) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(schema).safeParse(parsed);
    if (!result.success) return [];
    return result.data;
  } catch {
    return [];
  }
}

export async function loadEdgeDeliveryPolicy() {
  const root = await findRepoRoot();
  const fullPath = path.join(root, "ops", "governance", "edge-delivery.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = edgePolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function resolveEdgeRoute(input: { modulePath: string; region?: string }) {
  const policy = await loadEdgeDeliveryPolicy();
  const pop = (input.region && policy.regionToPop[input.region]) || policy.defaultPop;
  const normalizedPath = input.modulePath.startsWith("/") ? input.modulePath : `/${input.modulePath}`;

  return {
    pop,
    cacheKey: `${pop}:${normalizedPath}`,
    url: `https://${pop}.cdn.illuvrse.local${normalizedPath}`
  };
}

export async function getEdgePerformanceReport() {
  const root = await findRepoRoot();
  const policy = await loadEdgeDeliveryPolicy();
  const snapshotsPath = path.join(root, "ops", "logs", "edge-performance-snapshots.json");
  const snapshots = await readJsonArray(snapshotsPath, snapshotSchema);

  const budgets = policy.latencyBudgetsMs.map((budget) => {
    const matching = snapshots.filter((row) => row.modulePath.startsWith(budget.modulePrefix));
    const observedP95 = matching.length > 0 ? Math.max(...matching.map((row) => row.p95LatencyMs)) : null;
    const status = observedP95 !== null && observedP95 <= budget.maxP95LatencyMs ? "ok" : "breach";

    return {
      modulePrefix: budget.modulePrefix,
      maxP95LatencyMs: budget.maxP95LatencyMs,
      observedP95LatencyMs: observedP95,
      status,
      samples: matching.length
    };
  });

  return {
    policy: {
      defaultPop: policy.defaultPop
    },
    budgets,
    breaches: budgets.filter((row) => row.status === "breach").length
  };
}
