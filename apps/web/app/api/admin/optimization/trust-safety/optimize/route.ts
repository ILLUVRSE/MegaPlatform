export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { optimizeTrustSafety } from "@/lib/trustSafetyOptimizer";

const payloadSchema = z.object({
  candidates: z.array(
    z.object({
      id: z.string().min(1),
      engagementGain: z.number(),
      safetyRisk: z.number().min(0).max(1)
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await optimizeTrustSafety(parsed.data.candidates);
  return NextResponse.json({ ok: true, ...result });
}
