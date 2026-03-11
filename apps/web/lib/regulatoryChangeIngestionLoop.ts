import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ outputPath: z.string().min(1), requiredDeltaFields: z.array(z.string().min(1)) });
const changeSchema = z.object({ regulation: z.string().min(1), changeSummary: z.string().min(1), controlMapping: z.array(z.string().min(1)) });
const fallback = { outputPath: "ops/logs/regulatory-change-deltas.json", requiredDeltaFields: ["regulation", "changeSummary", "controlMapping"] };

async function findRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    try { await fs.access(path.join(current, "pnpm-workspace.yaml")); return current; } catch {}
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
  return process.cwd();
}

async function loadPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "regulatory-change-ingestion-loop.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function ingestRegulatoryChange(rawChange: unknown) {
  const parsed = changeSchema.safeParse(rawChange);
  if (!parsed.success) return { ok: false as const, reason: "invalid_change" };

  const root = await findRoot();
  const policy = await loadPolicy(root);
  const fullPath = path.join(root, policy.outputPath);
  const current = await fs.readFile(fullPath, "utf-8").then((raw) => JSON.parse(raw) as { deltas?: unknown[] }).catch(() => ({ deltas: [] }));
  const deltas = Array.isArray(current.deltas) ? current.deltas : [];
  const delta = { ...parsed.data, ingestedAt: new Date().toISOString() };
  await fs.writeFile(fullPath, `${JSON.stringify({ deltas: [delta, ...deltas].slice(0, 200) }, null, 2)}\n`, "utf-8");
  return { ok: true as const, delta, policyFields: policy.requiredDeltaFields };
}
