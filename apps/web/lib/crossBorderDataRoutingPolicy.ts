import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
const policySchema = z.object({ residency: z.record(z.string()), allowedTransfers: z.array(z.string()), defaultDestination: z.string().min(1) });
const reqSchema = z.object({ dataRegion: z.string().min(1), destinationRegion: z.string().optional() });
const fallback = { residency: { us: "us" }, allowedTransfers: ["us->us"], defaultDestination: "us" };
async function load(){ try{ const raw=await fs.readFile(path.join(process.cwd(),"ops","governance","cross-border-data-routing-policy.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;} }
export async function evaluateCrossBorderRouting(raw: unknown){ const parsed=reqSchema.safeParse(raw); if(!parsed.success) return {ok:false as const, reason:"invalid_request"}; const p=await load(); const from=parsed.data.dataRegion; const to=parsed.data.destinationRegion ?? p.residency[from] ?? p.defaultDestination; const key=`${from}->${to}`; const allowed=p.allowedTransfers.includes(key); return {ok:true as const, from, to, allowed, transferKey:key}; }
