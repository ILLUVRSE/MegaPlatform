export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { appendModelOutputProvenance, readModelOutputProvenanceLedger } from "@/lib/modelOutputProvenance";

const payloadSchema = z.object({
  outputId: z.string().min(1),
  outputKind: z.string().min(1),
  inputs: z.array(
    z.object({
      kind: z.string().min(1),
      ref: z.string().min(1)
    })
  ),
  decision: z.object({
    decisionId: z.string().min(1),
    decisionSource: z.string().min(1)
  }),
  generatedAt: z.string().datetime().optional()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ledger = await readModelOutputProvenanceLedger();
  return NextResponse.json({ ok: true, ledger });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await appendModelOutputProvenance(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}
