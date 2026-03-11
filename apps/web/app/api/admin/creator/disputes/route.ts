export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { listDisputes, upsertDispute } from "@/lib/disputeResolutionAutomation";

const payloadSchema = z.object({
  disputeId: z.string().min(1),
  claimantId: z.string().min(1),
  subjectId: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  state: z.string().min(1).optional()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const disputes = await listDisputes();
  return NextResponse.json({ ok: true, disputes });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await upsertDispute(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });

  return NextResponse.json({ ok: true, result });
}
