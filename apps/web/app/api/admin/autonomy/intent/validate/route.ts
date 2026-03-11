export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { validateStrategicIntent } from "@/lib/strategicIntent";

const payloadSchema = z.object({
  intentId: z.string().min(1),
  objective: z.string().min(1),
  owner: z.string().min(1),
  horizon: z.enum(["immediate", "quarter", "annual"]),
  successMetric: z.string().min(1),
  policyReference: z.string().min(1).optional()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await validateStrategicIntent(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}
