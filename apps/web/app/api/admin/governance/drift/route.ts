export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildGovernanceDriftReport } from "@/lib/governanceDrift";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await buildGovernanceDriftReport();
  return NextResponse.json({ ok: true, ...report });
}
