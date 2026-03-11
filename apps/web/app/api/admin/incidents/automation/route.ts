export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { loadIncidentAutomationActions, runIncidentAutomation } from "@/lib/incidentAutomation";

const payloadSchema = z.object({
  actionId: z.string().min(1),
  severity: z.enum(["SEV-1", "SEV-2", "SEV-3"])
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actions = await loadIncidentAutomationActions();
  return NextResponse.json({ ok: true, actions });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await runIncidentAutomation(parsed.data.actionId, parsed.data.severity);
  if (!result) return NextResponse.json({ error: "unknown action" }, { status: 404 });
  if (result.denied) {
    return NextResponse.json({ error: "action not permitted for severity" }, { status: 409 });
  }

  await writeAudit(
    auth.session.user.id,
    "INCIDENT_AUTOMATION_TRIGGERED",
    JSON.stringify({
      actionId: result.action.id,
      severity: parsed.data.severity,
      status: result.execution.status
    })
  );

  return NextResponse.json({
    ok: true,
    action: result.action,
    execution: result.execution
  });
}
