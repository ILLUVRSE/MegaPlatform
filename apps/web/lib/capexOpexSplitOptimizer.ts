import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  capexPreferredWorkloads: z.array(z.string().min(1)),
  opexPreferredWorkloads: z.array(z.string().min(1)),
  maxOpexRatio: z.number().min(0).max(1),
  fallbackMode: z.enum(["capex", "opex"])
});

const requestSchema = z.object({
  planId: z.string().min(1),
  workloads: z.array(
    z.object({
      workloadId: z.string().min(1),
      type: z.string().min(1)
    })
  )
});

const defaultPolicy = {
  capexPreferredWorkloads: ["steady_render", "batch_inference"],
  opexPreferredWorkloads: ["burst_recommendation", "ad_hoc_generation"],
  maxOpexRatio: 0.65,
  fallbackMode: "opex" as const
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "capex-opex-split-optimizer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

export async function optimizeCapexOpexSplit(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const routed = parsed.data.workloads.map((workload) => {
    if (policy.capexPreferredWorkloads.includes(workload.type)) return { ...workload, executionMode: "capex" as const };
    if (policy.opexPreferredWorkloads.includes(workload.type)) return { ...workload, executionMode: "opex" as const };
    return { ...workload, executionMode: policy.fallbackMode };
  });

  const opexCount = routed.filter((w) => w.executionMode === "opex").length;
  const opexRatio = routed.length === 0 ? 0 : opexCount / routed.length;

  return {
    ok: true as const,
    planId: parsed.data.planId,
    workloads: routed,
    metrics: {
      opexRatio,
      withinPolicy: opexRatio <= policy.maxOpexRatio
    },
    policy
  };
}
