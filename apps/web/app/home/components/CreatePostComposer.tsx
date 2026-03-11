"use client";

import { useState } from "react";

const TYPE_OPTIONS = ["TEXT", "SHORT", "WATCH_EPISODE", "WATCH_SHOW", "LIVE_CHANNEL", "GAME", "LINK"] as const;

type FeedCreateType = (typeof TYPE_OPTIONS)[number];

export default function CreatePostComposer({ onCreated }: { onCreated?: () => void }) {
  const [type, setType] = useState<FeedCreateType>("TEXT");
  const [caption, setCaption] = useState("");
  const [refValue, setRefValue] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    const payload: Record<string, string> = { type };
    if (caption.trim()) payload.caption = caption.trim();

    if (type === "SHORT") payload.shortPostId = refValue.trim();
    if (type === "WATCH_EPISODE") payload.episodeId = refValue.trim();
    if (type === "WATCH_SHOW") payload.showId = refValue.trim();
    if (type === "LIVE_CHANNEL") payload.liveChannelId = refValue.trim();
    if (type === "GAME") payload.gameKey = refValue.trim();
    if (type === "LINK") payload.linkUrl = refValue.trim();

    const res = await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setPending(false);
    if (!res.ok) return;
    setCaption("");
    setRefValue("");
    onCreated?.();
  }

  const refLabel =
    type === "SHORT"
      ? "ShortPost ID"
      : type === "WATCH_EPISODE"
        ? "Episode ID"
        : type === "WATCH_SHOW"
          ? "Show ID"
          : type === "LIVE_CHANNEL"
            ? "Live Channel ID"
            : type === "GAME"
              ? "Game key or route"
              : type === "LINK"
                ? "URL"
                : "";

  return (
    <section className="space-y-3 rounded-3xl border border-illuvrse-border bg-white p-5 shadow-card">
      <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Create Post</p>
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <select
          className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          value={type}
          onChange={(event) => setType(event.target.value as FeedCreateType)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Say something about this post"
        />
      </div>
      {type !== "TEXT" ? (
        <input
          className="w-full rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          value={refValue}
          onChange={(event) => setRefValue(event.target.value)}
          placeholder={refLabel}
        />
      ) : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
        >
          {pending ? "Posting..." : "Post"}
        </button>
      </div>
    </section>
  );
}
