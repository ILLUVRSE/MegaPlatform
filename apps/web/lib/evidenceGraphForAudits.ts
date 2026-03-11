import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ outputPath: z.string().min(1), maxNodes: z.number().int().positive(), maxEdges: z.number().int().positive() });
const nodeSchema = z.object({ id: z.string().min(1), kind: z.enum(["control", "evidence", "outcome"]) });
const edgeSchema = z.object({ from: z.string().min(1), to: z.string().min(1), relation: z.string().min(1) });
const upsertSchema = z.object({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) });
const querySchema = z.object({ sourceId: z.string().min(1) });
const fallback = { outputPath: "ops/logs/evidence-graph-for-audits.json", maxNodes: 500, maxEdges: 2000 };

async function root() { let c = process.cwd(); for (let i=0;i<8;i+=1){ try{ await fs.access(path.join(c,"pnpm-workspace.yaml")); return c;}catch{} const p=path.dirname(c); if(p===c) break; c=p;} return process.cwd(); }
async function loadPolicy(r:string){ try{ const raw=await fs.readFile(path.join(r,"ops","governance","evidence-graph-for-audits.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;}}
async function readGraph(r:string,o:string){ return fs.readFile(path.join(r,o),"utf-8").then((raw)=>JSON.parse(raw) as {nodes:unknown[];edges:unknown[]}).catch(()=>({nodes:[],edges:[]})); }

export async function upsertEvidenceGraph(raw: unknown) {
  const parsed = upsertSchema.safeParse(raw); if (!parsed.success) return { ok: false as const, reason: "invalid_payload" };
  const r = await root(); const p = await loadPolicy(r); const g = await readGraph(r,p.outputPath);
  const nodeMap = new Map<string, { id: string; kind: string }>();
  for (const n of g.nodes as Array<{id:string;kind:string}>) nodeMap.set(n.id,n);
  for (const n of parsed.data.nodes) nodeMap.set(n.id,n);
  const edgeKey = (e:{from:string;to:string;relation:string})=>`${e.from}:${e.relation}:${e.to}`;
  const edgeMap = new Map<string,{from:string;to:string;relation:string}>();
  for (const e of g.edges as Array<{from:string;to:string;relation:string}>) edgeMap.set(edgeKey(e),e);
  for (const e of parsed.data.edges) edgeMap.set(edgeKey(e),e);
  const nodes = Array.from(nodeMap.values()).slice(0,p.maxNodes);
  const edges = Array.from(edgeMap.values()).slice(0,p.maxEdges);
  await fs.writeFile(path.join(r,p.outputPath), `${JSON.stringify({ nodes, edges }, null, 2)}\n`, "utf-8");
  return { ok: true as const, counts: { nodes: nodes.length, edges: edges.length } };
}

export async function queryEvidenceGraph(raw: unknown) {
  const parsed = querySchema.safeParse(raw); if (!parsed.success) return { ok: false as const, reason: "invalid_query" };
  const r = await root(); const p = await loadPolicy(r); const g = await readGraph(r,p.outputPath);
  const relatedEdges = (g.edges as Array<{from:string;to:string;relation:string}>).filter((e)=>e.from===parsed.data.sourceId||e.to===parsed.data.sourceId);
  const relatedIds = new Set<string>([parsed.data.sourceId]); relatedEdges.forEach((e)=>{relatedIds.add(e.from); relatedIds.add(e.to);});
  const relatedNodes = (g.nodes as Array<{id:string;kind:string}>).filter((n)=>relatedIds.has(n.id));
  return { ok: true as const, nodes: relatedNodes, edges: relatedEdges };
}
