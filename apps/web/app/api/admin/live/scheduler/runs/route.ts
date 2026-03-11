export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runs = await prisma.schedulerRun.findMany({
    where: { scope: "LIVE" },
    orderBy: { startedAt: "desc" },
    take: 20
  });
  return NextResponse.json({ data: runs });
}
