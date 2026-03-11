export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { loadFailureDrillReports, loadFailureDrills, runFailureDrill } from "@/lib/reliability";

const runPayloadSchema = z.object({
  drillId: z.string().min(1)
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [drills, reports] = await Promise.all([loadFailureDrills(), loadFailureDrillReports()]);
  return NextResponse.json({
    ok: true,
    drills,
    reports
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = runPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const execution = await runFailureDrill(parsed.data.drillId);
  if (!execution) {
    return NextResponse.json({ error: "unknown drill id" }, { status: 404 });
  }

  await writeAudit(
    auth.session.user.id,
    "FAILURE_DRILL_RUN",
    JSON.stringify({
      drillId: execution.drill.id,
      target: execution.drill.target,
      status: execution.report.status
    })
  );

  return NextResponse.json({
    ok: true,
    drill: execution.drill,
    report: execution.report
  });
}
