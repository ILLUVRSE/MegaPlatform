import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
const policySchema = z.object({ outputPath: z.string().min(1), requiredSections: z.array(z.string().min(1)) });
const reqSchema = z.object({ decisionId: z.string().min(1), policyRationale: z.string().min(1), evidenceLinks: z.array(z.string().min(1)), outcome: z.string().min(1) });
const fallback = { outputPath: "ops/logs/legal-explainability-dossiers.json", requiredSections: ["policyRationale", "evidenceLinks", "outcome"] };
async function root(){let c=process.cwd(); for(let i=0;i<8;i+=1){try{await fs.access(path.join(c,"pnpm-workspace.yaml")); return c;}catch{} const p=path.dirname(c); if(p===c) break; c=p;} return process.cwd();}
async function load(r:string){try{const raw=await fs.readFile(path.join(r,"ops","governance","legal-explainability-dossier-generator.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;}}
export async function generateLegalExplainabilityDossier(raw: unknown){ const parsed=reqSchema.safeParse(raw); if(!parsed.success) return {ok:false as const, reason:"invalid_request"}; const r=await root(); const p=await load(r); const full=path.join(r,p.outputPath); const current=await fs.readFile(full,"utf-8").then((x)=>JSON.parse(x) as {dossiers?:unknown[]}).catch(()=>({dossiers:[]})); const dossiers=Array.isArray(current.dossiers)?current.dossiers:[]; const dossier={...parsed.data, generatedAt:new Date().toISOString()}; await fs.writeFile(full,`${JSON.stringify({dossiers:[dossier,...dossiers].slice(0,200)},null,2)}\n`,"utf-8"); return {ok:true as const, dossier, requiredSections:p.requiredSections}; }
