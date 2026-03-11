export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluatePersonalizationEthics } from "@/lib/personalizationEthics";

const payloadSchema = z.object({
  candidateScores: z.record(z.string(), z.number().min(0).max(1)).refine((scores) => Object.keys(scores).length > 0),
  diversityScore: z.number().min(0).max(1),
  manipulationRisk: z.number().min(0).max(1),
  targeting: z.object({
    usesSensitiveAttributes: z.boolean(),
    attributes: z.array(z.string().min(1))
  })
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await evaluatePersonalizationEthics(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result }, { status: result.allowed ? 200 : 409 });
}
