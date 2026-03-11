export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { evaluateWorldOriginRelocalization } from "@/lib/worldOriginRelocalization";

const payloadSchema = z.object({
  driftMeters: z.number().nonnegative(),
  reconnectRecoveryMs: z.number().int().nonnegative(),
  continuityScore: z.number().min(0).max(1),
  hasCachedOrigin: z.boolean()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const result = await evaluateWorldOriginRelocalization(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}
