export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const shortPostId = searchParams.get("shortPostId")?.trim() ?? "";

  const purchases = await prisma.shortPurchase.findMany({
    where: shortPostId ? { shortPostId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      shortPost: { select: { id: true, title: true, isPremium: true, price: true } }
    },
    take: 200
  });

  return NextResponse.json({ data: purchases });
}
