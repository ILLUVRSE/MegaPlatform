import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
const policySchema = z.object({ sensitiveContexts: z.array(z.string().min(1)), requiredApprovals: z.number().int().positive(), requiredPolicyTags: z.array(z.string().min(1)) });
const reqSchema = z.object({ actionId: z.string().min(1), context: z.string().min(1), approvals: z.number().int().nonnegative(), policyTags: z.array(z.string().min(1)) });
const fallback = { sensitiveContexts: ["health"], requiredApprovals: 2, requiredPolicyTags: ["sensitive_context", "manual_review"] };
async function load(){ try{ const raw=await fs.readFile(path.join(process.cwd(),"ops","governance","sensitive-context-isolation-v1.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;} }
export async function evaluateSensitiveContextIsolation(raw: unknown){ const parsed=reqSchema.safeParse(raw); if(!parsed.success) return {ok:false as const, reason:"invalid_request"}; const p=await load(); const sensitive=p.sensitiveContexts.includes(parsed.data.context); const missingTags=p.requiredPolicyTags.filter((t)=>!parsed.data.policyTags.includes(t)); const approved=parsed.data.approvals>=p.requiredApprovals; const allowed=!sensitive || (approved && missingTags.length===0); return {ok:true as const, sensitive, allowed, missingTags, requireApprovals:p.requiredApprovals}; }
