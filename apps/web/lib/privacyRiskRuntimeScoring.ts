import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
const policySchema = z.object({ blockThreshold: z.number().min(0).max(1), escalateThreshold: z.number().min(0).max(1), weights: z.object({ dataSensitivity: z.number(), scope: z.number(), transferRisk: z.number() }) });
const reqSchema = z.object({ actionId: z.string().min(1), dataSensitivity: z.number().min(0).max(1), scope: z.number().min(0).max(1), transferRisk: z.number().min(0).max(1) });
const fallback = { blockThreshold: 0.8, escalateThreshold: 0.55, weights: { dataSensitivity: 0.4, scope: 0.3, transferRisk: 0.3 } };
async function load(){ try{ const raw=await fs.readFile(path.join(process.cwd(),"ops","governance","privacy-risk-runtime-scoring.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;} }
export async function scorePrivacyRiskRuntime(raw: unknown){ const parsed=reqSchema.safeParse(raw); if(!parsed.success) return {ok:false as const, reason:"invalid_request"}; const p=await load(); const score=parsed.data.dataSensitivity*p.weights.dataSensitivity+parsed.data.scope*p.weights.scope+parsed.data.transferRisk*p.weights.transferRisk; const decision=score>=p.blockThreshold?"block":score>=p.escalateThreshold?"escalate":"allow"; return {ok:true as const, actionId:parsed.data.actionId, score, decision, policy:p}; }
