export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { generateContentProgrammingPlan } from "@/lib/contentProgrammingDirector";

const payloadSchema = z.object({
  campaignId: z.string().min(1),
  contentId: z.string().min(1),
  targetSurfaces: z.array(z.string().min(1)).min(1),
  priority: z.enum(["low", "medium", "high"]).optional()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const plan = await generateContentProgrammingPlan(parsed.data);
  if (!plan.ok) return NextResponse.json({ ok: false, error: plan.reason }, { status: 400 });

  return NextResponse.json({ ok: true, plan });
}
