import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const couplingSchema = z.object({ from: z.string().min(1), to: z.string().min(1) });
const policySchema = z.object({ forbiddenCouplings: z.array(couplingSchema) });
const requestSchema = z.object({ edges: z.array(couplingSchema).min(1) });

const fallback = {
  forbiddenCouplings: [
    { from: "xr_runtime", to: "finance" },
    { from: "xr_runtime", to: "creator_payouts" }
  ]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-boundary-linting.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function lintSpatialBoundaries(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const violations = parsed.data.edges.filter((edge) =>
    policy.forbiddenCouplings.some((forbidden) => forbidden.from === edge.from && forbidden.to === edge.to)
  );

  return { ok: true as const, passed: violations.length === 0, violations };
}
