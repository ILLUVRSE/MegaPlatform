export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { enforceAdminPolicy, policyViolationResponse } from "@/lib/policyEnforcement";

const payloadSchema = z.object({
  scope: z.string().min(1),
  action: z.string().min(1),
  target: z
    .object({
      kind: z.enum(["api", "infra"]).default("api"),
      resource: z.string().min(1).optional(),
      operation: z.string().min(1).optional(),
      id: z.string().min(1).optional()
    })
    .optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  policy: z.union([z.string().min(1), z.record(z.string(), z.unknown())]).optional(),
  policyPath: z.string().min(1).optional()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const decision = await enforceAdminPolicy({
    adminId: auth.session.user.id,
    ...parsed.data
  });

  if (!decision.ok) {
    return NextResponse.json({ ok: false, error: decision.reason }, { status: 400 });
  }

  if (!decision.allow) {
    return policyViolationResponse(decision);
  }

  return NextResponse.json({ ok: true, decision }, { status: 200 });
}
