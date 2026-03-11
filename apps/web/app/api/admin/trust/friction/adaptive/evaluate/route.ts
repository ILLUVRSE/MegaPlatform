export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateAdaptiveFriction } from "@/lib/adaptiveFrictionSystem";

const payloadSchema = z.object({
  sessionId: z.string().min(1),
  riskScore: z.number().min(0).max(1),
  priorInterventions: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await evaluateAdaptiveFriction(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}
