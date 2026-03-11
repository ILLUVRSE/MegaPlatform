export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { getEdgePerformanceReport } from "@/lib/edgeDelivery";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await getEdgePerformanceReport();
  return NextResponse.json({ ok: true, report });
}
