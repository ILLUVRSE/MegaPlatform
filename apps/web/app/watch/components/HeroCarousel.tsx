/**
 * Hero carousel for watch home.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildWatchToPartyHref, buildWatchToStudioHref } from "@/lib/journeyBridge";

type HeroItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  heroUrl?: string | null;
  posterUrl?: string | null;
  featuredEpisodeId?: string | null;
};

export default function HeroCarousel({ items }: { items: HeroItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-white">
        <h2 className="text-2xl font-semibold">No featured shows yet</h2>
        <p className="text-sm text-white/78">Add shows in Admin to populate the Watch experience.</p>
      </div>
    );
  }

  const current = items[index];

  return (
    <div
      className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 text-white"
      data-testid="watch-hero"
      aria-roledescription="carousel"
      aria-label="Featured shows"
    >
      <img
        src={current.heroUrl ?? "https://placehold.co/1400x600?text=ILLUVRSE+Watch"}
        alt={current.title}
        className="h-[380px] w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end gap-4 p-8">
        <div className="max-w-xl space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Featured</p>
          <h1 className="text-3xl font-semibold md:text-4xl">{current.title}</h1>
          <p className="text-sm text-white/82 line-clamp-3">{current.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {current.featuredEpisodeId ? (
            <Link
              href={`/watch/episode/${current.featuredEpisodeId}`}
              className="interactive-focus rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
            >
              Watch Now
            </Link>
          ) : null}
          <Link
            href={`/watch/show/${current.slug}`}
            className="interactive-focus rounded-full border border-white/50 px-5 py-2 text-xs font-semibold uppercase tracking-widest"
          >
            Details
          </Link>
          <Link
            href={buildWatchToPartyHref({ showSlug: current.slug, episodeId: current.featuredEpisodeId ?? undefined })}
            className="interactive-focus rounded-full border border-cyan-300/50 bg-cyan-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-50"
          >
            Watch Together
          </Link>
          <Link
            href={buildWatchToStudioHref({ showSlug: current.slug, episodeId: current.featuredEpisodeId ?? undefined })}
            className="interactive-focus rounded-full border border-amber-300/50 bg-amber-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-amber-50"
          >
            Remix in Studio
          </Link>
        </div>
        <div className="flex gap-2 pt-2">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`interactive-focus h-2 w-6 rounded-full ${idx === index ? "bg-white" : "bg-white/30"}`}
              onClick={() => setIndex(idx)}
              aria-label={`Show slide ${idx + 1}: ${item.title}`}
              aria-current={idx === index ? "true" : "false"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
