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
  const type = searchParams.get("type")?.trim() ?? "";
  const allowedTypes = new Set([
    "SHORT",
    "MEME",
    "WATCH_EPISODE",
    "WATCH_SHOW",
    "LIVE_CHANNEL",
    "GAME",
    "LINK",
    "UPLOAD",
    "TEXT",
    "SHARE"
  ]);
  const hidden = searchParams.get("hidden");
  const pinned = searchParams.get("pinned");
  const featured = searchParams.get("featured");

  const posts = await prisma.feedPost.findMany({
    where: {
      ...(allowedTypes.has(type) ? { type: type as any } : {}),
      ...(hidden === "true" ? { isHidden: true } : hidden === "false" ? { isHidden: false } : {}),
      ...(pinned === "true" ? { isPinned: true } : pinned === "false" ? { isPinned: false } : {}),
      ...(featured === "true" ? { isFeatured: true } : featured === "false" ? { isFeatured: false } : {})
    },
    orderBy: [{ isPinned: "desc" }, { featuredRank: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      shortPost: { select: { id: true, title: true } },
      show: { select: { id: true, title: true, slug: true } },
      episode: { select: { id: true, title: true } },
      liveChannel: { select: { id: true, name: true, slug: true } },
      shareOf: { select: { id: true, type: true } }
    }
  });

  return NextResponse.json({ data: posts });
}
