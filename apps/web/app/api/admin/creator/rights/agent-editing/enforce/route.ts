export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { enforceRightsAwareEditing } from "@/lib/rightsAwareAgentEditing";

const payloadSchema = z.object({
  assetId: z.string().min(1),
  licenseState: z.string().min(1),
  grantedRights: z.array(z.string().min(1)),
  hasAttribution: z.boolean(),
  pendingClaims: z.number().int().nonnegative()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await enforceRightsAwareEditing(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, result }, { status: result.allowed ? 200 : 409 });
}
