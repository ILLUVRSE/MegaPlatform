import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
const policySchema = z.object({ tests: z.array(z.string().min(1)), evidenceOutputPath: z.string().min(1) });
const reqSchema = z.object({ results: z.record(z.boolean()) });
const fallback = { tests: ["access_control", "retention_control", "audit_logging"], evidenceOutputPath: "ops/logs/automated-control-testing-v2.json" };
async function root(){let c=process.cwd(); for(let i=0;i<8;i+=1){try{await fs.access(path.join(c,"pnpm-workspace.yaml"));return c;}catch{} const p=path.dirname(c); if(p===c) break; c=p;} return process.cwd();}
async function load(r:string){try{const raw=await fs.readFile(path.join(r,"ops","governance","automated-control-testing-v2.json"),"utf-8"); const p=JSON.parse(raw); const v=policySchema.safeParse(p); return v.success?v.data:fallback;}catch{return fallback;}}
export async function runAutomatedControlTestingV2(raw: unknown){ const parsed=reqSchema.safeParse(raw); if(!parsed.success) return {ok:false as const, reason:"invalid_request"}; const r=await root(); const p=await load(r); const pass=p.tests.filter((t)=>parsed.data.results[t]===true); const fail=p.tests.filter((t)=>parsed.data.results[t]!==true); const run={pass,fail,passRate:p.tests.length===0?1:pass.length/p.tests.length,generatedAt:new Date().toISOString()}; const full=path.join(r,p.evidenceOutputPath); const current=await fs.readFile(full,"utf-8").then((x)=>JSON.parse(x) as {runs?:unknown[]}).catch(()=>({runs:[]})); const runs=Array.isArray(current.runs)?current.runs:[]; await fs.writeFile(full,`${JSON.stringify({runs:[run,...runs].slice(0,200)},null,2)}\n`,"utf-8"); return {ok:true as const, run}; }
