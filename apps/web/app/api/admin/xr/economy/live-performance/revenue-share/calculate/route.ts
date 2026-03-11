export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { calculateLivePerformanceRevenueShare } from "@/lib/livePerformanceRevenueShareEngine";

const payloadSchema = z.object({
  grossRevenue: z.number().nonnegative(),
  creatorSharePercent: z.number().min(0).max(100),
  platformSharePercent: z.number().min(0).max(100),
  collaboratorSharePercent: z.number().min(0).max(100),
  explanationProvided: z.boolean()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await calculateLivePerformanceRevenueShare(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
