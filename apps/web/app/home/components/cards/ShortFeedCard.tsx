"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { FeedPostDTO } from "@/lib/feed";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), { ssr: false });

export default function ShortFeedCard({ post, shortsMode = false }: { post: FeedPostDTO; shortsMode?: boolean }) {
  const [muted, setMuted] = useState(true);
  const short = post.shortPost;

  if (!short) {
    return <div className="rounded-2xl border border-illuvrse-border p-4 text-sm text-illuvrse-muted">Short unavailable.</div>;
  }

  if (short.mediaType === "IMAGE") {
    return <img src={short.mediaUrl} alt={short.title} className="w-full rounded-2xl object-cover" />;
  }

  return (
    <div className="space-y-2">
      <VideoPlayer src={short.mediaUrl} autoPlay muted={muted} controls={!shortsMode} />
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
      >
        {muted ? "Tap to unmute" : "Mute"}
      </button>
    </div>
  );
}
