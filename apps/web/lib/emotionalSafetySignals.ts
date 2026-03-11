import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  maxEntries: z.number().int().positive(),
  highSeverityThreshold: z.number().min(0).max(1),
  protectedPatterns: z.array(z.string().min(1)).min(1)
});

const signalSchema = z.object({
  signalId: z.string().min(1),
  userId: z.string().min(1),
  pattern: z.string().min(1),
  severity: z.number().min(0).max(1),
  source: z.string().min(1)
});

const defaultPolicy = {
  outputPath: "ops/logs/emotional-safety-signals-v1.json",
  maxEntries: 1000,
  highSeverityThreshold: 0.75,
  protectedPatterns: ["doom_scroll", "self_harm_spiral", "harassment_loop"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "emotional-safety-signals-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readStore(root: string, outputPath: string) {
  try {
    const raw = await fs.readFile(path.join(root, outputPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.signals)) return { signals: [] as unknown[] };
    return parsed;
  } catch {
    return { signals: [] as unknown[] };
  }
}

export async function appendEmotionalSafetySignal(rawSignal: unknown) {
  const parsed = signalSchema.safeParse(rawSignal);
  if (!parsed.success) return { ok: false as const, reason: "invalid_signal" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const store = await readStore(root, policy.outputPath);
  const nextSignals = [
    parsed.data,
    ...store.signals.filter((entry) => (entry as { signalId?: string }).signalId !== parsed.data.signalId)
  ].slice(0, policy.maxEntries);

  const normalized = {
    signals: nextSignals
  };

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");

  const highSeverity = parsed.data.severity >= policy.highSeverityThreshold;
  const protectedPattern = policy.protectedPatterns.includes(parsed.data.pattern);

  return {
    ok: true as const,
    signal: parsed.data,
    controlsRequired: highSeverity || protectedPattern,
    controlReason: highSeverity ? "high_severity" : protectedPattern ? "protected_pattern" : null
  };
}

export async function readEmotionalSafetySignals() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  return readStore(root, policy.outputPath);
}
