export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateCreatorActionPermission, upsertCreatorAutonomyContract } from "@/lib/creatorAutonomyContracts";

const contractSchema = z.object({
  creatorId: z.string().min(1),
  allowedActions: z.array(z.string().min(1)).min(1),
  deniedActions: z.array(z.string().min(1)),
  status: z.enum(["active", "suspended"])
});

const evaluateSchema = z.object({
  creatorId: z.string().min(1),
  action: z.string().min(1)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  if (body && typeof body === "object" && "action" in (body as Record<string, unknown>) && "creatorId" in (body as Record<string, unknown>) && !("allowedActions" in (body as Record<string, unknown>))) {
    const parsedEval = evaluateSchema.safeParse(body);
    if (!parsedEval.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

    const result = await evaluateCreatorActionPermission(parsedEval.data.creatorId, parsedEval.data.action);
    return NextResponse.json({ ok: true, result });
  }

  const parsed = contractSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await upsertCreatorAutonomyContract(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });

  return NextResponse.json({ ok: true, result });
}
