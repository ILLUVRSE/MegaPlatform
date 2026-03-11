/**
 * Shorts landing page.
 * Request/response: renders a DB-backed short feed.
 * Guard: none; public view.
 */
import ShortFeed from "./components/ShortFeed";
import { prisma } from "@illuvrse/db";
import { scoreShort, shouldHideShortByModeration } from "@/lib/shortsRanking";

export default async function ShortsPage() {
  const posts = await prisma.shortPost.findMany({
    take: 120,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    include: {
      _count: { select: { purchases: true } },
      feedPosts: {
        where: { shareOfId: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
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

  const items = posts
    .map((post) => {
      const feedPost = post.feedPosts[0];
      const unresolvedReports = feedPost?.reports.length ?? 0;
      if (
        shouldHideShortByModeration({
          isHidden: feedPost?.isHidden === true,
          isShadowbanned: feedPost?.isShadowbanned === true,
          unresolvedReports
        })
      ) {
        return null;
      }
      return {
        id: post.id,
        title: post.title,
        caption: feedPost?.caption ?? post.caption,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        isPremium: post.isPremium,
        price: post.price,
        createdAt: post.createdAt.toISOString(),
        rankScore: scoreShort({
          publishedAt: post.publishedAt,
          likeCount: feedPost?.likeCount ?? 0,
          commentCount: feedPost?.commentCount ?? 0,
          shareCount: feedPost?.shareCount ?? 0,
          isPinned: feedPost?.isPinned ?? false,
          isFeatured: feedPost?.isFeatured ?? false,
          featuredRank: feedPost?.featuredRank ?? 0,
          purchaseCount: post._count.purchases
        })
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 30)
    .map(({ rankScore: _rankScore, ...item }) => item);

  return (
    <div className="space-y-6">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Shorts</p>
        <h1 className="text-3xl font-semibold">Scroll the latest ILLUVRSE shorts</h1>
        <p className="text-sm text-illuvrse-muted">
          Ranked by engagement and recency, with moderation + premium access controls.
        </p>
      </header>
      <ShortFeed items={items} />
    </div>
  );
}
