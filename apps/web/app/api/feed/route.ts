export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { authOptions } from "@/lib/auth";
import { attachAnonCookie, ensureAnonId } from "@/lib/anon";
import { serializeFeedPost } from "@/lib/feed";
import { scoreShort, shouldHideShortByModeration } from "@/lib/shortsRanking";
import { FEED_TRUST_POLICY, WALL_RANKING_POLICY } from "@/lib/feedPolicy";
import { clampAffinityBoost, deriveWallFreshnessSignals, scoreWallPost } from "@/lib/feedRanking";
import { apiInvalidPayload } from "@/lib/apiError";

const createFeedPostSchema = z
  .object({
    type: z.enum([
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
    ]),
    caption: z.string().trim().max(500).optional(),
    authorProfile: z.string().trim().max(80).optional(),
    shortPostId: z.string().optional(),
    showId: z.string().optional(),
    episodeId: z.string().optional(),
    liveChannelId: z.string().optional(),
    gameKey: z.string().optional(),
    linkUrl: z.string().url().optional(),
    uploadUrl: z.string().url().optional(),
    shareOfId: z.string().optional()
  })
  .superRefine((payload, ctx) => {
    const hasReference = Boolean(
      payload.shortPostId ||
        payload.showId ||
        payload.episodeId ||
        payload.liveChannelId ||
        payload.gameKey ||
        payload.linkUrl ||
        payload.uploadUrl ||
        payload.shareOfId
    );
    if (!payload.caption?.trim() && !hasReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["caption"],
        message: "Caption or content reference is required"
      });
    }

    if (payload.type === "SHARE" && !payload.shareOfId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shareOfId"],
        message: "shareOfId is required for SHARE"
      });
    }
  });

function buildAffinityByType(
  reactions: Array<{ post: { type: string }; createdAt: Date }>,
  comments: Array<{ post: { type: string }; createdAt: Date }>
) {
  const affinity = new Map<string, number>();

  for (const item of reactions) {
    const ageHours = Math.max(0, (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60));
    const weight = Math.exp(-ageHours / 36) * 0.75;
    affinity.set(item.post.type, (affinity.get(item.post.type) ?? 0) + weight);
  }

  for (const item of comments) {
    const ageHours = Math.max(0, (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60));
    const weight = Math.exp(-ageHours / 48) * 0.55;
    affinity.set(item.post.type, (affinity.get(item.post.type) ?? 0) + weight);
  }

  return affinity;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "shorts" ? "shorts" : "wall";
  const cursor = searchParams.get("cursor");
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const { anonId, shouldSetCookie } = ensureAnonId(request);

  if (mode === "shorts") {
    const raw = await prisma.feedPost.findMany({
      where: {
        type: { in: ["SHORT", "MEME"] },
        shortPostId: { not: null },
        shareOfId: null,
        ...(cursor ? { id: { lt: cursor } } : {})
      },
      orderBy: { id: "desc" },
      take: WALL_RANKING_POLICY.candidateTake,
      include: {
        shortPost: {
          select: {
            id: true,
            title: true,
            caption: true,
            mediaUrl: true,
            mediaType: true,
            isPremium: true,
            price: true,
            publishedAt: true,
            _count: { select: { purchases: true } }
          }
        },
        reports: {
          where: { resolvedAt: null },
          select: { id: true }
        },
        reactions: {
          where: {
            type: "LIKE",
            ...(userId ? { userId } : { anonId })
          },
          select: { id: true }
        }
      }
    });

    const ranked = raw
      .map((post) => {
        if (!post.shortPost) return null;
        if (
          shouldHideShortByModeration({
            isHidden: post.isHidden,
            isShadowbanned: post.isShadowbanned,
            unresolvedReports: post.reports.length
          })
        ) {
          return null;
        }

        const score = scoreShort({
          publishedAt: post.shortPost.publishedAt,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          shareCount: post.shareCount,
          isPinned: post.isPinned,
          isFeatured: post.isFeatured,
          featuredRank: post.featuredRank,
          purchaseCount: post.shortPost._count.purchases
        });
        return { post, score };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.score - a.score || b.post.id.localeCompare(a.post.id))
      .slice(0, WALL_RANKING_POLICY.pageSize);

    const items = ranked.map((entry) =>
      serializeFeedPost({
        ...entry.post,
        shortPost: entry.post.shortPost
      })
    );
    const nextCursor = raw.length === WALL_RANKING_POLICY.candidateTake ? raw[raw.length - 1]?.id ?? null : null;
    const response = NextResponse.json({ items, nextCursor });
    return attachAnonCookie(response, anonId, shouldSetCookie);
  }

  const [viewerReactions, viewerComments, raw] = await Promise.all([
    prisma.feedReaction.findMany({
      where: {
        type: "LIKE",
        ...(userId ? { userId } : { anonId })
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        createdAt: true,
        post: { select: { type: true } }
      }
    }),
    prisma.feedComment.findMany({
      where: userId ? { userId } : { anonId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        createdAt: true,
        post: { select: { type: true } }
      }
    }),
    prisma.feedPost.findMany({
      where: {
        type: { notIn: ["SHORT", "MEME"] },
        ...(cursor ? { id: { lt: cursor } } : {})
      },
      orderBy: { id: "desc" },
      take: WALL_RANKING_POLICY.candidateTake,
      include: {
        shortPost: {
          select: { id: true, title: true, caption: true, mediaUrl: true, mediaType: true }
        },
        show: {
          select: { id: true, title: true, slug: true, posterUrl: true, heroUrl: true }
        },
        episode: {
          select: { id: true, title: true, lengthSeconds: true, assetUrl: true }
        },
        liveChannel: {
          select: { id: true, name: true, slug: true, heroUrl: true, logoUrl: true }
        },
        shareOf: true,
        reports: {
          where: { resolvedAt: null },
          select: { id: true }
        },
        reactions: {
          where: {
            type: "LIKE",
            ...(userId ? { userId } : { anonId })
          },
          select: { id: true }
        }
      }
    })
  ]);

  const affinityByType = buildAffinityByType(viewerReactions, viewerComments);

  const ranked = raw
    .map((post) => {
      const unresolvedReports = post.reports.length;
      if (
        post.isHidden ||
        post.isShadowbanned ||
        unresolvedReports >= FEED_TRUST_POLICY.hideUnresolvedReportsThreshold
      ) {
        return null;
      }

      const affinityBoost = clampAffinityBoost(affinityByType.get(post.type) ?? 0);
      const freshnessSignals = deriveWallFreshnessSignals({
        createdAt: post.createdAt,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: post.shareCount
      });
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
      }, {
        allowSurge: !freshnessSignals.lowQualityRapidPost,
        maxFreshnessBoost: freshnessSignals.lowQualityRapidPost ? WALL_RANKING_POLICY.lowQualityFreshnessCap : undefined
      });

      return { post, score };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score - a.score || b.post.id.localeCompare(a.post.id))
    .slice(0, WALL_RANKING_POLICY.pageSize);

  const items = ranked.map((entry) => serializeFeedPost(entry.post));
  const nextCursor = raw.length === WALL_RANKING_POLICY.candidateTake ? raw[raw.length - 1]?.id ?? null : null;

  const response = NextResponse.json({ items, nextCursor });
  return attachAnonCookie(response, anonId, shouldSetCookie);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const { anonId, shouldSetCookie } = ensureAnonId(request);

  const body = await request.json();
  const parsed = createFeedPostSchema.safeParse(body);
  if (!parsed.success) {
    return apiInvalidPayload(
      "Invalid payload",
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
    );
  }

  const payload = parsed.data;

  const post = await prisma.feedPost.create({
    data: {
      type: payload.type,
      caption: payload.caption?.trim() || null,
      authorId: userId,
      authorProfile: userId ? session?.user?.name ?? "User" : payload.authorProfile?.trim() || "Anonymous",
      shortPostId: payload.shortPostId,
      showId: payload.showId,
      episodeId: payload.episodeId,
      liveChannelId: payload.liveChannelId,
      gameKey: payload.gameKey,
      linkUrl: payload.linkUrl,
      uploadUrl: payload.uploadUrl,
      shareOfId: payload.shareOfId
    },
    include: {
      shortPost: {
        select: { id: true, title: true, caption: true, mediaUrl: true, mediaType: true }
      },
      show: {
        select: { id: true, title: true, slug: true, posterUrl: true, heroUrl: true }
      },
      episode: {
        select: { id: true, title: true, lengthSeconds: true, assetUrl: true }
      },
      liveChannel: {
        select: { id: true, name: true, slug: true, heroUrl: true, logoUrl: true }
      },
      shareOf: true,
      reactions: { select: { id: true } }
    }
  });

  if (payload.type === "SHARE" && payload.shareOfId) {
    await prisma.feedPost.update({
      where: { id: payload.shareOfId },
      data: { shareCount: { increment: 1 } }
    });
  }

  const response = NextResponse.json({ item: serializeFeedPost(post) }, { status: 201 });
  return attachAnonCookie(response, anonId, shouldSetCookie);
}
