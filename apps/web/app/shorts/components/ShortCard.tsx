/**
 * Short card preview for the shorts feed.
 * Request/response: renders a single short post and Meme This action.
 * Guard: client component; triggers meme jobs via API.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import Link from "next/link";

type ShortPostItem = {
  id: string;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: "VIDEO" | "IMAGE";
  isPremium: boolean;
  price?: number | null;
  createdAt: string;
  sourceWatchHref?: string | null;
};

export default function ShortCard({ item }: { item: ShortPostItem }) {
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyCode, setPartyCode] = useState("");
  const [partyNext, setPartyNext] = useState(false);
  const [partyStatus, setPartyStatus] = useState<"idle" | "pending" | "done">("idle");
  const [partyError, setPartyError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (item.mediaType !== "VIDEO" || !videoRef.current) return;
    if (!item.mediaUrl.endsWith(".m3u8")) return;

    if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = item.mediaUrl;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(item.mediaUrl);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    }
  }, [item.mediaType, item.mediaUrl]);

  const handleMeme = async () => {
    if (status === "pending") return;
    setStatus("pending");
    const response = await fetch(`/api/shorts/${item.id}/meme`, { method: "POST" });
    if (response.ok) {
      setStatus("done");
    } else {
      setStatus("idle");
    }
  };

  const handleSendToParty = async () => {
    if (partyStatus === "pending") return;
    const trimmed = partyCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setPartyError("Party code must be 6 characters.");
      return;
    }
    setPartyStatus("pending");
    setPartyError(null);

    const response = await fetch(`/api/party/${trimmed}/playlist/append`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shortPostId: item.id,
        position: partyNext ? "next" : "append"
      })
    });

    if (response.ok) {
      setPartyStatus("done");
      setPartyOpen(false);
      setToast({ message: "Sent to party playlist.", tone: "success" });
      return;
    }

    const payload = await response.json().catch(() => ({ error: "Unable to send to party." }));
    if (response.status === 404) {
      setToast({ message: payload.error ?? "Party or short not found.", tone: "error" });
    } else {
      setToast({ message: payload.error ?? "Unable to send to party.", tone: "error" });
    }
    setPartyStatus("idle");
  };

  return (
    <section className="relative flex min-h-[calc(100vh-13.5rem)] snap-start items-center justify-center rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,6,23,0.92))] p-4">
      {toast ? (
        <div
          className={`fixed right-6 top-6 z-[60] rounded-2xl px-4 py-3 text-xs font-semibold shadow-card ${
            toast.tone === "success"
              ? "bg-illuvrse-primary text-white"
              : "bg-illuvrse-danger text-white"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,420px)_120px]">
        <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-2xl shadow-cyan-950/20">
          <Link href={`/shorts/${item.id}`} className="block">
            {item.mediaType === "VIDEO" ? (
              <video
                ref={videoRef}
                className="aspect-[9/16] w-full object-cover"
                src={item.mediaUrl.endsWith(".m3u8") ? undefined : item.mediaUrl}
                controls={false}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                className="aspect-[9/16] w-full object-cover"
                src={item.mediaUrl}
                alt={item.title}
              />
            )}
          </Link>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent p-5 text-white">
            <div className="max-w-[85%] space-y-2">
              <p className="text-sm font-semibold">@{item.title.toLowerCase().replace(/\s+/g, "")}</p>
              <p className="text-sm text-white/84">{item.caption}</p>
              <p className="text-xs uppercase tracking-[0.26em] text-white/54">Soundtrack live cut</p>
            </div>
          </div>
        </div>

        <div className="mx-auto flex flex-row gap-3 lg:flex-col lg:justify-end">
          <button type="button" className="rounded-full border border-white/10 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white">
            Like
          </button>
          <Link href={`/shorts/${item.id}`} className="rounded-full border border-white/10 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white">
            Comment
          </Link>
          {item.sourceWatchHref ? (
            <Link
              href={item.sourceWatchHref}
              className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100"
            >
              Watch full episode
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setPartyOpen(true);
              setPartyStatus("idle");
              setPartyError(null);
            }}
            className="rounded-full border border-white/10 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white"
          >
            Share
          </button>
          <button
            type="button"
            onClick={handleMeme}
            className="rounded-full border border-white/10 bg-cyan-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100"
            disabled={status === "pending"}
          >
            {status === "pending" ? "Queueing" : status === "done" ? "Queued" : "Meme"}
          </button>
          {item.isPremium ? (
            <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
              Premium {item.price != null ? `$${(item.price / 100).toFixed(2)}` : ""}
            </div>
          ) : null}
        </div>
      </div>
      {partyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-md rounded-3xl border border-illuvrse-border bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Party</p>
                <h3 className="text-lg font-semibold">Send short to party</h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={() => setPartyOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-illuvrse-text">
                Party code
                <input
                  className="mt-2 w-full rounded-full border border-illuvrse-border px-4 py-2 text-sm uppercase tracking-widest"
                  placeholder="ABC123"
                  value={partyCode}
                  maxLength={6}
                  onChange={(event) =>
                    setPartyCode(event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={partyNext}
                  onChange={(event) => setPartyNext(event.target.checked)}
                />
                Add as next item
              </label>
              {partyError ? <p className="text-xs text-illuvrse-danger">{partyError}</p> : null}
              <button
                type="button"
                onClick={handleSendToParty}
                disabled={partyStatus === "pending"}
                className="w-full rounded-full bg-illuvrse-primary px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white"
              >
                {partyStatus === "pending" ? "Sending" : "Send to Party"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
