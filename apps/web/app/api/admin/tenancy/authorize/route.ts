export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { authorizeTenantBoundary } from "@/lib/tenantControls";

const payloadSchema = z.object({
  tenantId: z.string().min(1).optional(),
  requestPath: z.string().min(1),
  moduleKey: z.string().min(1).optional(),
  rowTenantId: z.string().min(1).optional()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await authorizeTenantBoundary(parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 403 });

  return NextResponse.json({ ok: true, tenantId: result.tenantId });
}
