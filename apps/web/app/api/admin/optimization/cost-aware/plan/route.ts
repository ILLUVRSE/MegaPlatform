export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateCostAwarePlan } from "@/lib/costAwareOptimizer";

const payloadSchema = z.object({
  actions: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      estimatedCostCents: z.number().int().nonnegative()
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await evaluateCostAwarePlan(parsed.data.actions);
  const status = result.pass ? 200 : 409;
  return NextResponse.json({ ok: result.pass, ...result }, { status });
}
