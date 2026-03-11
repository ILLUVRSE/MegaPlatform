export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { arbitrateCrossLoopPriorities } from "@/lib/crossLoopPriorityArbiter";

const payloadSchema = z.object({
  candidates: z.array(
    z.object({
      id: z.string().min(1),
      loop: z.string().min(1),
      domain: z.string().min(1),
      basePriority: z.number(),
      attributes: z.record(z.string(), z.string()).optional()
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await arbitrateCrossLoopPriorities(parsed.data.candidates);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}
