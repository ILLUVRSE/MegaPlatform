export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { evaluateRolloutGuardrails } from "@/lib/rolloutGuardrails";

const payloadSchema = z.object({
  metrics: z.array(
    z.object({
      metricKey: z.string().min(1),
      regressionRatio: z.number().min(0)
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await evaluateRolloutGuardrails(parsed.data.metrics);
  if (result.rollbackTriggered) {
    await writeAudit(
      auth.session.user.id,
      "AUTO_ROLLBACK_TRIGGERED",
      JSON.stringify({
        blockers: result.blockers.map((item) => item.metricKey)
      })
    );
  }

  const status = result.rollbackTriggered ? 409 : 200;
  return NextResponse.json({ ok: !result.rollbackTriggered, ...result }, { status });
}
