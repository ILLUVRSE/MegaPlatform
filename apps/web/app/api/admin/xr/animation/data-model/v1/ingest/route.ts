export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { ingestAnimationDataModelV1 } from "@/lib/animationDataModelV1";

const payloadSchema = z.object({
  clips: z.array(z.object({ clipId: z.string().min(1), durationMs: z.number().int().positive(), frameRate: z.number().positive() })).min(1),
  states: z.array(z.object({ stateId: z.string().min(1), clipId: z.string().min(1), loop: z.boolean() })).min(1)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await ingestAnimationDataModelV1(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
