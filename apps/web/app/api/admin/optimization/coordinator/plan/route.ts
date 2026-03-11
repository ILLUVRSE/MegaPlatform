export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { buildCoordinationPlan } from "@/lib/crossModuleCoordinator";

const payloadSchema = z.object({
  proposals: z.array(
    z.object({
      module: z.string().min(1),
      objectiveId: z.string().min(1),
      expectedImpact: z.number(),
      ecosystemImpact: z.number(),
      safetyRisk: z.number().min(0).max(1)
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await buildCoordinationPlan(parsed.data.proposals);
  return NextResponse.json({ ok: true, ...result });
}
