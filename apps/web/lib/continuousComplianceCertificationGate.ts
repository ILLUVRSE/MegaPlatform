import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
const policySchema = z.object({ requiredCertifications: z.array(z.string().min(1)), nonCertifiedMode: z.enum(["constrained", "halt"]), blockedCapabilitiesWhenNonCertified: z.array(z.string().min(1)) });
const reqSchema = z.object({ activeCertifications: z.array(z.string().min(1)), requestedCapabilities: z.array(z.string().min(1)) });
const fallback = { requiredCertifications: ["financial_v1", "privacy_v1", "safety_v1"], nonCertifiedMode: "constrained" as const, blockedCapabilitiesWhenNonCertified: ["autonomous_publish"] };
async function load(){ try{ const raw=await fs.readFile(path.join(process.cwd(),"ops","governance","continuous-compliance-certification-gate.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;} }
export async function evaluateContinuousComplianceCertificationGate(raw: unknown){ const parsed=reqSchema.safeParse(raw); if(!parsed.success) return {ok:false as const, reason:"invalid_request"}; const p=await load(); const missing=p.requiredCertifications.filter((c)=>!parsed.data.activeCertifications.includes(c)); const certified=missing.length===0; if(certified) return {ok:true as const, certified:true, mode:"normal", blockedCapabilities:[]}; const blocked=parsed.data.requestedCapabilities.filter((cap)=>p.blockedCapabilitiesWhenNonCertified.includes(cap)); return {ok:true as const, certified:false, mode:p.nonCertifiedMode, missingCertifications:missing, blockedCapabilities:blocked}; }
