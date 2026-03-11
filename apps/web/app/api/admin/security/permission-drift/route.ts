export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { buildPermissionDriftReport } from "@/lib/permissionDrift";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await buildPermissionDriftReport(prisma);
  return NextResponse.json({
    ok: true,
    ...report
  });
}
