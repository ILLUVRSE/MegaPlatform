"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedPostDTO } from "@/lib/feed";
import FeedCard from "@/app/home/components/FeedCard";
import CommentsDrawer from "@/app/home/components/CommentsDrawer";
import ShareModal from "@/app/home/components/ShareModal";
import ReportModal from "@/app/home/components/ReportModal";

export default function FeedList({ mode, refreshToken, isAdmin = false }: { mode: "wall" | "shorts"; refreshToken: number; isAdmin?: boolean }) {
  const [items, setItems] = useState<FeedPostDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams();
      qs.set("mode", mode);
      if (!reset && cursor) qs.set("cursor", cursor);
      try {
        const res = await fetch(`/api/feed?${qs.toString()}`);
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Feed request failed (${res.status}): ${body || "empty response"}`);
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          const body = await res.text();
          throw new Error(`Feed response was not JSON: ${body || "empty response"}`);
        }
        const payload = await res.json();
        setItems((current) => (reset ? payload.items : [...current, ...payload.items]));
        setCursor(payload.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load feed");
        if (reset) setItems([]);
        setCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading, mode]
  );

  useEffect(() => {
    setCursor(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, refreshToken]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !cursor) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          void load(false);
        }
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, load]);

  return (
    <>
      <div
        className={
          mode === "shorts"
            ? "grid h-[calc(100vh-220px)] snap-y snap-mandatory gap-5 overflow-y-auto pr-1 md:mx-auto md:max-w-xl"
            : "space-y-5"
        }
      >
        {items.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            shortsMode={mode === "shorts"}
            onComment={setCommentPostId}
            onShare={setSharePostId}
            onReport={setReportPostId}
            onChanged={() => void load(true)}
            isAdmin={isAdmin}
          />
        ))}
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {cursor ? <div ref={sentinelRef} className="h-6" /> : null}
      </div>
      <CommentsDrawer postId={commentPostId} open={Boolean(commentPostId)} onClose={() => setCommentPostId(null)} />
      <ShareModal postId={sharePostId} open={Boolean(sharePostId)} onClose={() => setSharePostId(null)} />
      <ReportModal postId={reportPostId} open={Boolean(reportPostId)} onClose={() => setReportPostId(null)} />
    </>
  );
}
