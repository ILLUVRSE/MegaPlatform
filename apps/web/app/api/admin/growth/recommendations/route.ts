export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { clampAffinityBoost, scoreWallPost } from "@/lib/feedRanking";
import { PLATFORM_EVENT_NAMES } from "@/lib/platformEvents";

type EventCountRow = { module: string; opens: bigint; directOpens: bigint };

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [posts, moduleRows] = await Promise.all([
    prisma.feedPost.findMany({
      where: {
        createdAt: { gte: since },
        shareOfId: null,
        isHidden: false,
        isShadowbanned: false
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        reports: { where: { resolvedAt: null }, select: { id: true } }
      }
    }),
    prisma.$queryRaw<EventCountRow[]>`
      SELECT "module" AS module,
             COUNT(*) FILTER (WHERE "event" = ${PLATFORM_EVENT_NAMES.moduleOpen})::bigint AS opens,
             COUNT(*) FILTER (WHERE "event" = ${PLATFORM_EVENT_NAMES.moduleOpenDirect})::bigint AS "directOpens"
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY "module"
      ORDER BY opens DESC
      LIMIT 12
    `
  ]);

  const ranked = posts
    .map((post) => {
      const unresolvedReports = post.reports.length;
      const affinityBoost = clampAffinityBoost(0);
      const score = scoreWallPost({
        createdAt: post.createdAt,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: post.shareCount,
        isPinned: post.isPinned,
        isFeatured: post.isFeatured,
        featuredRank: post.featuredRank,
        unresolvedReports,
        affinityBoost
      });
      return {
        id: post.id,
        type: post.type,
        createdAt: post.createdAt.toISOString(),
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: post.shareCount,
        unresolvedReports,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  const moduleFunnel = moduleRows.map((row) => {
    const opens = Number(row.opens);
    const directOpens = Number(row.directOpens);
    return {
      module: row.module,
      opens,
      directOpens,
      directOpenRate: opens > 0 ? directOpens / opens : 0
    };
  });

  return NextResponse.json({
    ok: true,
    window: "7d",
    generatedAt: new Date().toISOString(),
    recommendations: ranked,
    moduleFunnel
  });
}
