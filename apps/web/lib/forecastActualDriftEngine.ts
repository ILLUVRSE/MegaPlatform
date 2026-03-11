import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  driftWarningRatio: z.number().min(0),
  driftCriticalRatio: z.number().min(0),
  maxCorrectiveActions: z.number().int().positive(),
  requiredActions: z.array(z.string().min(1)),
  outputPath: z.string().min(1)
});

const requestSchema = z.object({
  programId: z.string().min(1),
  forecastSpendCents: z.number().int().nonnegative(),
  actualSpendCents: z.number().int().nonnegative()
});

const defaultPolicy = {
  driftWarningRatio: 0.1,
  driftCriticalRatio: 0.25,
  maxCorrectiveActions: 3,
  requiredActions: ["tighten_budget", "reduce_non_urgent_runs", "escalate_finance_review"],
  outputPath: "ops/logs/forecast-vs-actual-drift-reports.json"
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "forecast-vs-actual-drift-engine.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function appendReport(root: string, outputPath: string, report: Record<string, unknown>) {
  const fullPath = path.join(root, outputPath);
  const current = await fs
    .readFile(fullPath, "utf-8")
    .then((raw) => JSON.parse(raw) as { reports?: unknown[] })
    .catch(() => ({ reports: [] }));

  const reports = Array.isArray(current.reports) ? current.reports : [];
  const next = { reports: [report, ...reports].slice(0, 200) };
  await fs.writeFile(fullPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}

export async function evaluateForecastActualDrift(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const forecast = parsed.data.forecastSpendCents;
  const actual = parsed.data.actualSpendCents;
  const baseline = Math.max(forecast, 1);
  const driftCents = actual - forecast;
  const driftRatio = Math.abs(driftCents) / baseline;

  const severity =
    driftRatio >= policy.driftCriticalRatio ? "critical" : driftRatio >= policy.driftWarningRatio ? "warning" : "normal";

  const correctiveActions =
    severity === "normal"
      ? []
      : policy.requiredActions.slice(0, policy.maxCorrectiveActions).map((action) => ({
          action,
          mode: severity === "critical" ? "immediate" : "planned"
        }));

  const report = {
    reportId: `drift-${parsed.data.programId}-${forecast}-${actual}`,
    programId: parsed.data.programId,
    forecastSpendCents: forecast,
    actualSpendCents: actual,
    driftCents,
    driftRatio,
    severity,
    correctiveActions,
    generatedAt: new Date().toISOString()
  };

  await appendReport(root, policy.outputPath, report);

  return {
    ok: true as const,
    report,
    policyActionTriggered: correctiveActions.length > 0
  };
}
