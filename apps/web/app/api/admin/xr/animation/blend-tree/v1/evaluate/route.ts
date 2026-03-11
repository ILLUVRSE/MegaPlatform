export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateBlendTreeRuntimeV1 } from "@/lib/blendTreeRuntimeV1";

const payloadSchema = z.object({
  characterClasses: z.array(z.string().min(1)).min(1),
  nodes: z.array(z.object({ nodeId: z.string().min(1), depth: z.number().int().nonnegative(), blendMode: z.string().min(1) })).min(1)
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await evaluateBlendTreeRuntimeV1(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
