export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { findOpsRoot, moveTask } from "@/lib/ops";
import { z } from "zod";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import { writeAudit } from "@/lib/audit";

const payloadSchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "blocked"])
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `admin:ops-task-update:${resolveClientKey(req, auth.session.user.id)}`,
    windowMs: 60_000,
    limit: 60
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const body = parsed.data;
  const opsRoot = await findOpsRoot();
  if (!opsRoot) {
    return NextResponse.json({ error: "ops root not found" }, { status: 404 });
  }

  try {
    const { id } = await params;
    const payload = await moveTask(opsRoot, id, body.status);
    await writeAudit(
      auth.session.user.id,
      "OPS_TASK_STATUS_UPDATED",
      JSON.stringify({ id, status: body.status })
    );
    return NextResponse.json({ ok: true, task: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
