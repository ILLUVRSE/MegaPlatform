export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") === "resolved" ? "resolved" : "open";

  const reports = await prisma.feedReport.findMany({
    where: status === "open" ? { resolvedAt: null } : { resolvedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        select: {
          id: true,
          type: true,
          caption: true,
          isHidden: true,
          isShadowbanned: true,
          createdAt: true
        }
      }
    }
  });

  return NextResponse.json({ data: reports });
}
