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
    <div className="rounded-3xl border border-illuvrse-border bg-white shadow-card">
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
      <Link href={`/shorts/${item.id}`} className="block">
        {item.mediaType === "VIDEO" ? (
          <video
            ref={videoRef}
            className="h-48 w-full rounded-t-3xl object-cover"
            src={item.mediaUrl.endsWith(".m3u8") ? undefined : item.mediaUrl}
            controls={false}
          />
        ) : (
          <img
            className="h-48 w-full rounded-t-3xl object-cover"
            src={item.mediaUrl}
            alt={item.title}
          />
        )}
      </Link>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{item.title}</h3>
          {item.isPremium ? (
            <span className="rounded-full bg-illuvrse-primary px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white">
              Premium {item.price != null ? `· $${(item.price / 100).toFixed(2)}` : ""}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-illuvrse-muted">{item.caption}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-illuvrse-muted">
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPartyOpen(true);
                setPartyStatus("idle");
                setPartyError(null);
              }}
              className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]"
            >
              Send to Party
            </button>
            <button
              type="button"
              onClick={handleMeme}
              className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]"
              disabled={status === "pending"}
            >
              {status === "pending" ? "Memeing" : status === "done" ? "Queued" : "Meme This"}
            </button>
          </div>
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
    </div>
  );
}
