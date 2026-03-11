export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { loadDsarEvidence, loadDsarWorkflows, runDsarRequest } from "@/lib/dsar";

const payloadSchema = z.object({
  requestId: z.string().min(1),
  type: z.enum(["export", "delete"]),
  userId: z.string().min(1)
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [workflows, evidence] = await Promise.all([loadDsarWorkflows(), loadDsarEvidence()]);
  return NextResponse.json({
    ok: true,
    workflows,
    evidence
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const execution = await runDsarRequest(parsed.data.requestId, parsed.data.type, parsed.data.userId);
  if (!execution) {
    return NextResponse.json({ error: "workflow unavailable" }, { status: 500 });
  }

  await writeAudit(
    auth.session.user.id,
    "DSAR_REQUEST_PROCESSED",
    JSON.stringify({
      requestId: execution.requestId,
      type: execution.type,
      userId: execution.userId,
      status: execution.status
    })
  );

  return NextResponse.json({
    ok: true,
    execution
  });
}
