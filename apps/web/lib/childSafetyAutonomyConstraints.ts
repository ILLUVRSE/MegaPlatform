import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
const policySchema = z.object({ youthContexts: z.array(z.string().min(1)), blockedActions: z.array(z.string().min(1)), maxAutonomyLevel: z.enum(["none", "assisted", "full"]) });
const reqSchema = z.object({ context: z.string().min(1), action: z.string().min(1), autonomyLevel: z.enum(["none", "assisted", "full"]) });
const fallback = { youthContexts: ["kids_mode"], blockedActions: ["direct_message"], maxAutonomyLevel: "assisted" as const };
async function load(){ try{ const raw=await fs.readFile(path.join(process.cwd(),"ops","governance","child-safety-autonomy-constraints.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;} }
export async function enforceChildSafetyAutonomyConstraints(raw: unknown){ const parsed=reqSchema.safeParse(raw); if(!parsed.success) return {ok:false as const, reason:"invalid_request"}; const p=await load(); const youth=p.youthContexts.includes(parsed.data.context); if(!youth) return {ok:true as const, allowed:true, reason:"not_youth_context"}; const blocked=p.blockedActions.includes(parsed.data.action); const levelViolation=parsed.data.autonomyLevel==="full" && p.maxAutonomyLevel!=="full"; return {ok:true as const, allowed:!(blocked||levelViolation), blocked, levelViolation}; }
