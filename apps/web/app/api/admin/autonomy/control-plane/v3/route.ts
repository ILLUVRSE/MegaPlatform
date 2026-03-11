export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateAutonomyControlPlaneV3 } from "@/lib/autonomyControlPlaneV3";

const payloadSchema = z.object({
  domain: z.string().min(1),
  attributes: z.record(z.string(), z.string()).optional(),
  atIso: z.string().datetime().optional(),
  budget: z.object({
    changeClass: z.string().min(1),
    requestedUnits: z.number().int().positive(),
    consumedUnits: z.number().int().nonnegative()
  }),
  blastRadius: z.object({
    actionId: z.string().min(1),
    riskScore: z.number().min(0).max(1),
    affectedDomains: z.array(z.string().min(1)).min(1),
    estimatedAffectedUsers: z.number().int().nonnegative()
  })
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await evaluateAutonomyControlPlaneV3(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result }, { status: result.allowed ? 200 : 409 });
}
