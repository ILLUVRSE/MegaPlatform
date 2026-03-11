export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluatePolicyDecision } from "@/lib/policyEngine";

const payloadSchema = z.object({
  scope: z.string().min(1),
  action: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()).default({})
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const decision = await evaluatePolicyDecision(parsed.data);
  if (!decision.ok) {
    return NextResponse.json({ ok: false, error: decision.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, decision }, { status: 200 });
}
