export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export async function POST(_: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  await prisma.feedReport.update({
    where: { id: reportId },
    data: { resolvedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
