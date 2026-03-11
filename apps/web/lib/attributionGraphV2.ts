import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  maxEdges: z.number().int().positive(),
  allowedEdgeTypes: z.array(z.string().min(1)).min(1),
  requireEvidenceRef: z.boolean()
});

const edgeSchema = z.object({
  edgeId: z.string().min(1),
  subjectId: z.string().min(1),
  objectId: z.string().min(1),
  edgeType: z.string().min(1),
  actorKind: z.enum(["human", "agent"]),
  evidenceRef: z.string().min(1).optional()
});

const defaultPolicy = {
  outputPath: "ops/logs/attribution-graph-v2.json",
  maxEdges: 50000,
  allowedEdgeTypes: ["authored", "edited", "remixed", "prompted", "approved"],
  requireEvidenceRef: true
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "attribution-graph-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readGraph(root: string, outputPath: string) {
  try {
    const raw = await fs.readFile(path.join(root, outputPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.edges)) return { edges: [] as unknown[] };
    return parsed;
  } catch {
    return { edges: [] as unknown[] };
  }
}

export async function appendAttributionEdge(rawEdge: unknown) {
  const parsed = edgeSchema.safeParse(rawEdge);
  if (!parsed.success) return { ok: false as const, reason: "invalid_edge" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  if (!policy.allowedEdgeTypes.includes(parsed.data.edgeType)) {
    return { ok: false as const, reason: "edge_type_not_allowed" };
  }
  if (policy.requireEvidenceRef && !parsed.data.evidenceRef) {
    return { ok: false as const, reason: "missing_evidence_ref" };
  }

  const graph = await readGraph(root, policy.outputPath);
  const nextEdges = [
    parsed.data,
    ...graph.edges.filter((edge) => (edge as { edgeId?: string }).edgeId !== parsed.data.edgeId)
  ].slice(0, policy.maxEdges);

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify({ edges: nextEdges }, null, 2)}\n`, "utf-8");

  return { ok: true as const, edge: parsed.data, edgeCount: nextEdges.length };
}

export async function queryAttributionEdges(subjectId: string) {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const graph = await readGraph(root, policy.outputPath);
  return graph.edges.filter((edge) => (edge as { subjectId?: string }).subjectId === subjectId);
}
