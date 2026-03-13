export const dynamic = "force-dynamic";

/**
 * Shorts feed API.
 * GET: ?cursor= -> { posts }
 * Guard: none; public feed.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { scoreShort, shouldHideShortByModeration } from "@/lib/shortsRanking";
import { resolveShortSourceWatchLinks } from "@/lib/shortSourceWatchLink";

type ShortPostSourceFields = {
  sourceShowId: string | null;
  sourceEpisodeId: string | null;
  sourceSceneId: string | null;
  sourceTimestampSeconds: number | null;
};

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20)
});

function encodeCursor(publishedAt: Date, id: string) {
  return Buffer.from(`${publishedAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const [publishedAtRaw, id] = decoded.split("|");
    const publishedAt = new Date(publishedAtRaw ?? "");
    if (!id || Number.isNaN(publishedAt.getTime())) return null;
    return { publishedAt, id };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const cursor = decodeCursor(parsed.data.cursor);
  const take = parsed.data.limit;
  const candidateTake = Math.max(take * 3, take + 10);

  const posts = await prisma.shortPost.findMany({
    take: candidateTake,
    where: cursor
      ? {
          OR: [
            { publishedAt: { lt: cursor.publishedAt } },
            {
              AND: [{ publishedAt: cursor.publishedAt }, { id: { lt: cursor.id } }]
            }
          ]
        }
      : undefined,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    include: {
      _count: { select: { purchases: true } },
      feedPosts: {
        where: {
          shareOfId: null
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          type: true,
          caption: true,
          isHidden: true,
          isShadowbanned: true,
          isPinned: true,
          isFeatured: true,
          featuredRank: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          reports: {
            where: { resolvedAt: null },
            select: { id: true }
          }
        }
      }
    }
  });

  const visible = posts
    .map((post) => {
      const shortPost = post as typeof post & ShortPostSourceFields;
      const feedPost = post.feedPosts[0];
      const unresolvedReports = feedPost?.reports.length ?? 0;
      const blockedByModeration = shouldHideShortByModeration({
        isHidden: feedPost?.isHidden === true,
        isShadowbanned: feedPost?.isShadowbanned === true,
        unresolvedReports
      });
      if (blockedByModeration) return null;

      const score = scoreShort({
        publishedAt: post.publishedAt,
        likeCount: feedPost?.likeCount ?? 0,
        commentCount: feedPost?.commentCount ?? 0,
        shareCount: feedPost?.shareCount ?? 0,
        isPinned: feedPost?.isPinned ?? false,
        isFeatured: feedPost?.isFeatured ?? false,
        featuredRank: feedPost?.featuredRank ?? 0,
        purchaseCount: post._count.purchases
      });

      return {
        id: post.id,
        projectId: post.projectId,
        title: post.title,
        caption: feedPost?.caption ?? post.caption,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        isPremium: post.isPremium,
        price: post.price,
        createdAt: post.createdAt.toISOString(),
        publishedAt: post.publishedAt.toISOString(),
        sourceShowId: shortPost.sourceShowId,
        sourceEpisodeId: shortPost.sourceEpisodeId,
        sourceSceneId: shortPost.sourceSceneId,
        sourceTimestampSeconds: shortPost.sourceTimestampSeconds,
        rankScore: score,
        stats: {
          likes: feedPost?.likeCount ?? 0,
          comments: feedPost?.commentCount ?? 0,
          shares: feedPost?.shareCount ?? 0,
          purchases: post._count.purchases
        }
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.rankScore - a.rankScore || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, take);

  const sourceWatchLinks = await resolveShortSourceWatchLinks(
    visible.map((item) => ({
      id: item.id,
      sourceShowId: item.sourceShowId,
      sourceEpisodeId: item.sourceEpisodeId,
      sourceTimestampSeconds: item.sourceTimestampSeconds
    }))
  );

  const responsePosts = visible.map(({ rankScore: _rankScore, ...item }) => ({
    ...item,
    sourceWatchHref: sourceWatchLinks.get(item.id)?.href ?? null
  }));

  const lastRaw = posts[posts.length - 1];
  const nextCursor = posts.length === candidateTake && lastRaw ? encodeCursor(lastRaw.publishedAt, lastRaw.id) : null;

  return NextResponse.json({
    posts: responsePosts,
    nextCursor
  });
}
