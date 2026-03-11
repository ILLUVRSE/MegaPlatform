export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { buildBudgetStatus } from "@/lib/platformGovernance";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await buildBudgetStatus(prisma);
  return NextResponse.json({
    ok: true,
    ...status
  });
}
