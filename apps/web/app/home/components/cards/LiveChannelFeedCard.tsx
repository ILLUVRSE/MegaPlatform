import Link from "next/link";
import type { FeedPostDTO } from "@/lib/feed";

export default function LiveChannelFeedCard({ post }: { post: FeedPostDTO }) {
  const channel = post.liveChannel;
  if (!channel) return null;
  return (
    <Link href={`/watch/live/${channel.id}`} className="block rounded-2xl border border-illuvrse-border p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Live Channel</p>
      <p className="text-lg font-semibold">{channel.name}</p>
    </Link>
  );
}
