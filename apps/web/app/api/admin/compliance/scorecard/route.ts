export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { buildComplianceScorecard } from "@/lib/complianceScorecard";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scorecard = await buildComplianceScorecard(prisma);
  return NextResponse.json({
    ok: true,
    ...scorecard
  });
}
