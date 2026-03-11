"use client";

import { useState } from "react";
import type { FeedPostDTO } from "@/lib/feed";
import ShortFeedCard from "@/app/home/components/cards/ShortFeedCard";
import ImageFeedCard from "@/app/home/components/cards/ImageFeedCard";
import WatchFeedCard from "@/app/home/components/cards/WatchFeedCard";
import LiveChannelFeedCard from "@/app/home/components/cards/LiveChannelFeedCard";
import GameFeedCard from "@/app/home/components/cards/GameFeedCard";
import SurfaceCard from "@/components/ui/SurfaceCard";

type FeedCardProps = {
  post: FeedPostDTO;
  shortsMode?: boolean;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onReport: (postId: string) => void;
  onChanged?: () => void;
  isAdmin?: boolean;
};

export default function FeedCard({
  post,
  shortsMode = false,
  onComment,
  onShare,
  onReport,
  onChanged,
  isAdmin = false
}: FeedCardProps) {
  const [liked, setLiked] = useState(Boolean(post.viewerLiked));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = `feed-card-menu-${post.id}`;

  async function toggleLike() {
    const res = await fetch(`/api/feed/${post.id}/like`, { method: "POST" });
    if (!res.ok) return;
    const payload = await res.json();
    setLiked(payload.liked);
    setLikeCount(payload.likeCount);
  }

  async function adminAction(action: string, payload?: Record<string, unknown>) {
    const res = await fetch(`/api/admin/feed/${post.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {})
    });
    if (!res.ok) return;
    onChanged?.();
  }

  return (
    <SurfaceCard className={`space-y-4 rounded-3xl p-5 ${shortsMode ? "min-h-[calc(100vh-220px)] snap-start" : ""}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{post.authorProfile ?? "Anonymous"}</p>
          <p className="text-xs text-illuvrse-muted">{new Date(post.createdAt).toLocaleString()}</p>
          {post.isPinned ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Pinned</p> : null}
        </div>
        <div className="relative">
          <button
            type="button"
            className="rounded-full border border-illuvrse-border px-2 py-1 text-xs"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label="Open feed post actions"
            onClick={() => setMenuOpen((value) => !value)}
          >
            ...
          </button>
          {menuOpen ? (
            <div id={menuId} role="menu" className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-illuvrse-border bg-white p-2 shadow-lg">
              <button type="button" role="menuitem" className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-illuvrse-bg" onClick={() => onReport(post.id)}>
                Report
              </button>
              {isAdmin ? (
                <>
                  <button type="button" role="menuitem" className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-illuvrse-bg" onClick={() => void adminAction(post.isHidden ? "unhide" : "hide")}>
                    {post.isHidden ? "Unhide" : "Hide"}
                  </button>
                  <button type="button" role="menuitem" className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-illuvrse-bg" onClick={() => void adminAction("shadowban", { shadowbanned: !post.isShadowbanned })}>
                    {post.isShadowbanned ? "Unshadow" : "Shadowban"}
                  </button>
                  <button type="button" role="menuitem" className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-illuvrse-bg" onClick={() => void adminAction("pin", { pinned: !post.isPinned })}>
                    {post.isPinned ? "Unpin" : "Pin"}
                  </button>
                  <button type="button" role="menuitem" className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-illuvrse-bg" onClick={() => void adminAction("feature", { featured: !post.isFeatured })}>
                    {post.isFeatured ? "Unfeature" : "Feature"}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {post.caption ? <p className="text-sm text-illuvrse-text">{post.caption}</p> : null}

      {(post.type === "SHORT" || post.type === "MEME") && post.shortPost ? <ShortFeedCard post={post} shortsMode={shortsMode} /> : null}
      {(post.type === "UPLOAD" || post.type === "LINK") && !post.shortPost ? <ImageFeedCard post={post} /> : null}
      {post.type === "WATCH_EPISODE" || post.type === "WATCH_SHOW" ? <WatchFeedCard post={post} /> : null}
      {post.type === "LIVE_CHANNEL" ? <LiveChannelFeedCard post={post} /> : null}
      {post.type === "GAME" ? <GameFeedCard post={post} /> : null}
      {post.type === "LINK" && post.linkUrl ? (
        <a href={post.linkUrl} className="block rounded-2xl border border-illuvrse-border p-3 text-sm text-illuvrse-primary">
          {post.linkUrl}
        </a>
      ) : null}
      {post.type === "SHARE" && post.shareOf ? (
        <div className="rounded-2xl border border-illuvrse-border bg-illuvrse-bg p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Shared Post</p>
          <p className="text-sm font-semibold">{post.shareOf.caption ?? post.shareOf.type}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${liked ? "border-illuvrse-primary text-illuvrse-primary" : "border-illuvrse-border"}`}
          onClick={toggleLike}
        >
          Like {likeCount}
        </button>
        <button type="button" className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest" onClick={() => onComment(post.id)}>
          Comment {post.commentCount}
        </button>
        <button type="button" className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest" onClick={() => onShare(post.id)}>
          Share {post.shareCount}
        </button>
        <button type="button" className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest">Save</button>
      </div>
    </SurfaceCard>
  );
}
