import type { FeedPostDTO } from "@/lib/feed";

export default function GameFeedCard({ post }: { post: FeedPostDTO }) {
  const gameKey = post.gameKey;
  if (!gameKey) return null;

  const href = gameKey.startsWith("http")
    ? gameKey
    : gameKey.startsWith("/")
      ? gameKey
      : `/games/${gameKey}`;

  return (
    <a href={href} className="block rounded-2xl border border-illuvrse-border p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Game</p>
      <p className="text-lg font-semibold">{gameKey}</p>
    </a>
  );
}
