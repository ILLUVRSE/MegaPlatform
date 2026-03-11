export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { listExperienceActions, upsertExperienceAction } from "@/lib/humanLoopExperienceConsole";

const payloadSchema = z.object({
  actionId: z.string().min(1),
  actionType: z.string().min(1),
  status: z.enum(["proposed", "approved", "overridden"]),
  operator: z.string().min(1).optional(),
  reason: z.string().min(1).optional()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actions = await listExperienceActions();
  return NextResponse.json({ ok: true, actions });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await upsertExperienceAction(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });

  return NextResponse.json({ ok: true, result });
}
