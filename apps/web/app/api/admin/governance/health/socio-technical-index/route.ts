export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateSocioTechnicalHealthIndex } from "@/lib/socioTechnicalHealthIndex";

const payloadSchema = z.object({ system: z.number().min(0).max(1), user: z.number().min(0).max(1), creator: z.number().min(0).max(1), operator: z.number().min(0).max(1), requestedAutonomyBound: z.number().min(0).max(1) });

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await evaluateSocioTechnicalHealthIndex(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
