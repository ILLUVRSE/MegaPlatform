export const dynamic = "force-dynamic";

/**
 * Shorts detail API.
 * GET: -> { post }
 * Guard: none; public feed.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { shouldHideShortByModeration } from "@/lib/shortsRanking";

const ANON_COOKIE = "ILLUVRSE_ANON_ID";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.shortPost.findUnique({
    where: { id },
    include: {
      _count: { select: { purchases: true } },
      feedPosts: {
        where: { shareOfId: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          caption: true,
          isHidden: true,
          isShadowbanned: true,
          reports: {
            where: { resolvedAt: null },
            select: { id: true }
          }
        }
      }
    }
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const feedPost = post.feedPosts[0];
  const unresolvedReports = feedPost?.reports.length ?? 0;
  if (
    shouldHideShortByModeration({
      isHidden: feedPost?.isHidden === true,
      isShadowbanned: feedPost?.isShadowbanned === true,
      unresolvedReports
    })
  ) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  let hasAccess = true;
  if (post.isPremium) {
    const session = await getServerSession(authOptions);
    const buyerId = session?.user?.id ?? null;

    let buyerAnonId: string | null = null;
    if (!buyerId) {
      const cookie = request.headers.get("cookie") ?? "";
      const match = cookie.match(new RegExp(`${ANON_COOKIE}=([^;]+)`));
      buyerAnonId = match?.[1] ?? null;
    }

    if (!buyerId && !buyerAnonId) {
      hasAccess = false;
    } else {
      const purchase = await prisma.shortPurchase.findFirst({
        where: {
          shortPostId: id,
          ...(buyerId ? { buyerId } : { buyerAnonId })
        },
        select: { id: true }
      });
      hasAccess = Boolean(purchase);
    }
  }

  return NextResponse.json({
    post: {
      id: post.id,
      projectId: post.projectId,
      title: post.title,
      caption: feedPost?.caption ?? post.caption,
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType,
      isPremium: post.isPremium,
      price: post.price,
      createdAt: post.createdAt.toISOString(),
      publishedAt: post.publishedAt.toISOString()
    },
    access: {
      hasAccess,
      requiresPurchase: post.isPremium && !hasAccess
    },
    stats: {
      purchases: post._count.purchases
    }
  });
}
