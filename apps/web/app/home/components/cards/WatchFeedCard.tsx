import Link from "next/link";
import type { FeedPostDTO } from "@/lib/feed";

export default function WatchFeedCard({ post }: { post: FeedPostDTO }) {
  if (post.episode) {
    return (
      <Link href={`/watch/episode/${post.episode.id}`} className="block rounded-2xl border border-illuvrse-border p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Watch Episode</p>
        <p className="text-lg font-semibold">{post.episode.title}</p>
      </Link>
    );
  }

  if (post.show) {
    return (
      <Link href={`/watch/show/${post.show.slug}`} className="block rounded-2xl border border-illuvrse-border p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Watch Show</p>
        <p className="text-lg font-semibold">{post.show.title}</p>
      </Link>
    );
  }

  return null;
}
