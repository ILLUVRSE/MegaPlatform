export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { appendDecisionJournalEntry, queryDecisionJournal } from "@/lib/decisionJournal";

const createSchema = z.object({
  agentRole: z.string().min(1),
  decisionType: z.string().min(1),
  rationale: z.string().min(1),
  evidence: z.array(
    z.object({
      kind: z.enum(["metric", "log", "policy", "runbook"]),
      ref: z.string().min(1),
      note: z.string().min(1).optional()
    })
  ),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  relatedTaskId: z.string().min(1).optional(),
  outcomes: z.array(z.string().min(1)).default([])
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const result = await queryDecisionJournal({
    agentRole: params.get("agentRole") ?? undefined,
    decisionType: params.get("decisionType") ?? undefined,
    since: params.get("since") ?? undefined,
    maxItems: params.get("maxItems") ? Number.parseInt(params.get("maxItems") ?? "", 10) : undefined
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const result = await appendDecisionJournalEntry(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });
  }

  return NextResponse.json(result);
}
