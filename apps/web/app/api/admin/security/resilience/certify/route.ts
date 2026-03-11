export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateResilienceCertification } from "@/lib/resilienceCertification";

const payloadSchema = z.object({
  incidentClassesCovered: z.array(z.string().min(1)),
  checks: z.object({
    red_team: z.object({ passRate: z.number().min(0).max(1), criticalFindings: z.number().int().nonnegative() }),
    incident_replay: z.object({ passRate: z.number().min(0).max(1) }),
    region_sovereignty: z.object({ sovereign: z.boolean() })
  })
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await evaluateResilienceCertification(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result }, { status: result.certified ? 200 : 409 });
}
