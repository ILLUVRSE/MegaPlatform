export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { scoreMotionSicknessRisk } from "@/lib/motionSicknessRiskScoring";

const payloadSchema = z.object({
  vectionIntensity: z.number().min(0).max(1),
  angularVelocityDps: z.number().nonnegative(),
  frameTimeVarianceMs: z.number().nonnegative(),
  sessionDurationMinutes: z.number().nonnegative(),
  mitigationPromptShown: z.boolean(),
  safeModeEnabled: z.boolean()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await scoreMotionSicknessRisk(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
