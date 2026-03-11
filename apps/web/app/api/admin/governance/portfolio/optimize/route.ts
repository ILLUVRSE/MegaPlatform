export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { optimizeProgramPortfolio } from "@/lib/programPortfolioOptimizer";

const payloadSchema = z.object({
  initiatives: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      impactScore: z.number().min(0).max(1),
      riskScore: z.number().min(0).max(1),
      costScore: z.number().min(0).max(1),
      impactEvidence: z.string().min(1),
      riskEvidence: z.string().min(1),
      costEvidence: z.string().min(1)
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await optimizeProgramPortfolio(parsed.data.initiatives);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, optimization: result });
}
