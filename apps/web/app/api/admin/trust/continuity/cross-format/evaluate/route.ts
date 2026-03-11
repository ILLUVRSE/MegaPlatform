export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateCrossFormatContinuity } from "@/lib/crossFormatContinuity";

const payloadSchema = z.object({
  fromSurface: z.string().min(1),
  toSurface: z.string().min(1),
  context: z.record(z.string(), z.string().min(1)),
  idleMinutes: z.number().int().nonnegative(),
  riskLevel: z.enum(["low", "medium", "high"])
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await evaluateCrossFormatContinuity(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result }, { status: result.coherent ? 200 : 409 });
}
