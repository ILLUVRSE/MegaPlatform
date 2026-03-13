/**
 * Shorts detail page with paywall behavior.
 * Request/response: renders short playback or paywall.
 * Guard: none; access uses purchase stub.
 */
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { resolveShortSourceWatchLinks } from "@/lib/shortSourceWatchLink";
import ShortMediaPlayer from "../components/ShortMediaPlayer";
import ShortPaywall from "../components/ShortPaywall";

const ANON_COOKIE = "ILLUVRSE_ANON_ID";

type ShortPostSourceFields = {
  sourceShowId: string | null;
  sourceEpisodeId: string | null;
  sourceTimestampSeconds: number | null;
};

export default async function ShortDetailPage({ params }: { params: { id: string } }) {
  const post = await prisma.shortPost.findUnique({ where: { id: params.id } });
  if (!post) {
    notFound();
  }
  const shortPost = post as typeof post & ShortPostSourceFields;

  let hasAccess = true;
  if (post.isPremium) {
    const session = await getServerSession(authOptions);
    const buyerId = session?.user?.id ?? null;
    const cookieStore = await cookies();
    const anonId = cookieStore.get(ANON_COOKIE)?.value ?? null;

    if (!buyerId && !anonId) {
      hasAccess = false;
    } else {
      const purchase = await prisma.shortPurchase.findFirst({
        where: {
          shortPostId: post.id,
          ...(buyerId ? { buyerId } : { buyerAnonId: anonId })
        }
      });
      hasAccess = Boolean(purchase);
    }
  }

  const formattedPrice = post.price != null ? `$${(post.price / 100).toFixed(2)}` : null;
  const sourceWatchLinks = await resolveShortSourceWatchLinks([
    {
      id: post.id,
      sourceShowId: shortPost.sourceShowId,
      sourceEpisodeId: shortPost.sourceEpisodeId,
      sourceTimestampSeconds: shortPost.sourceTimestampSeconds
    }
  ]);
  const sourceWatchHref = sourceWatchLinks.get(post.id)?.href ?? null;

  return (
    <div className="space-y-6">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Shorts</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">{post.title}</h1>
          {post.isPremium ? (
            <span className="rounded-full bg-illuvrse-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white">
              Premium {formattedPrice ? `· ${formattedPrice}` : ""}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-illuvrse-muted">{post.caption}</p>
        {sourceWatchHref ? (
          <Link
            href={sourceWatchHref}
            className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100"
          >
            Watch full episode
          </Link>
        ) : null}
      </header>

      <div className="party-card space-y-4">
        {post.isPremium && !hasAccess ? (
          <ShortPaywall
            shortId={post.id}
            mediaUrl={post.mediaUrl}
            mediaType={post.mediaType}
            price={post.price}
          />
        ) : (
          <ShortMediaPlayer mediaUrl={post.mediaUrl} mediaType={post.mediaType} />
        )}
      </div>
    </div>
  );
}
