export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { queryEvidenceGraph, upsertEvidenceGraph } from "@/lib/evidenceGraphForAudits";
const upsertSchema = z.object({ nodes: z.array(z.object({ id: z.string().min(1), kind: z.enum(["control", "evidence", "outcome"]) })), edges: z.array(z.object({ from: z.string().min(1), to: z.string().min(1), relation: z.string().min(1) })) });
export async function GET(req: Request) { const auth=await requireAdmin(); if(!auth.ok) return NextResponse.json({error:"Unauthorized"},{status:401}); const url=new URL(req.url); const sourceId=url.searchParams.get("sourceId")??""; const result=await queryEvidenceGraph({sourceId}); if(!result.ok) return NextResponse.json({ok:false,reason:result.reason},{status:400}); return NextResponse.json({ok:true,result}); }
export async function POST(req: Request){ const auth=await requireAdmin(); if(!auth.ok) return NextResponse.json({error:"Unauthorized"},{status:401}); const body=await req.json().catch(()=>null); const parsed=upsertSchema.safeParse(body); if(!parsed.success) return NextResponse.json({error:"invalid payload"},{status:400}); const result=await upsertEvidenceGraph(parsed.data); if(!result.ok) return NextResponse.json({ok:false,reason:result.reason},{status:400}); return NextResponse.json({ok:true,result}); }
