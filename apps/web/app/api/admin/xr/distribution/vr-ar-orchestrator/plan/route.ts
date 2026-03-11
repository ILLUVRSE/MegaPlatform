export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { planDistributionOrchestratorVrArEndpoints } from "@/lib/distributionOrchestratorVrArEndpoints";

const payloadSchema = z.object({
  endpointClass: z.enum(["vr", "ar", "mixed"]),
  rolloutPercentRequested: z.number().min(0).max(100),
  certificationPassed: z.boolean(),
  regionalCompliancePassed: z.boolean(),
  fallbackPlanPresent: z.boolean()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await planDistributionOrchestratorVrArEndpoints(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
