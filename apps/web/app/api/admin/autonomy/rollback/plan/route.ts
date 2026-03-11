export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { buildGlobalRollbackPlan } from "@/lib/globalRollbackOrchestrator";

const payloadSchema = z.object({
  changes: z.array(
    z.object({
      changeId: z.string().min(1),
      changeClass: z.string().min(1),
      priority: z.number(),
      rollbackAction: z.string().min(1)
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const plan = await buildGlobalRollbackPlan(parsed.data);
  if (!plan.ok) return NextResponse.json({ ok: false, reason: plan.reason }, { status: 400 });

  return NextResponse.json({ ok: true, plan });
}
