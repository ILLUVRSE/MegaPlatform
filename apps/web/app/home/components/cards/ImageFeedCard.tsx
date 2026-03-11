import type { FeedPostDTO } from "@/lib/feed";

export default function ImageFeedCard({ post }: { post: FeedPostDTO }) {
  const url = post.shortPost?.mediaUrl ?? post.uploadUrl ?? post.linkUrl;
  if (!url) return null;
  return <img src={url} alt={post.caption ?? "Feed image"} className="w-full rounded-2xl object-cover" />;
}
