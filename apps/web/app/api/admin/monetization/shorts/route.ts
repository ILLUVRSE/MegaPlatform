export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const posts = await prisma.shortPost.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { caption: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { publishedAt: "desc" },
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
      _count: { select: { purchases: true } }
    },
    take: 200
  });

  return NextResponse.json({ data: posts });
}
