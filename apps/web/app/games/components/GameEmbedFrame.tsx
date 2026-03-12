"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackGameEvent } from "@/lib/gamesTelemetry";

type Props = {
  slug: string;
  title: string;
  description: string;
  embedPath: string;
  playPath: string;
};

export default function GameEmbedFrame({ slug, title, description, embedPath, playPath }: Props) {
  useEffect(() => {
    void trackGameEvent({
      event: "games.open",
      surface: "games_detail",
      gameSlug: slug,
      href: `/games/${slug}`
    });
  }, [slug]);

  return (
    <div className="space-y-6">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Game</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-illuvrse-muted">{description}</p>
        <Link
          className="party-button mt-4 inline-flex w-fit"
          href={playPath}
          onClick={() =>
            void trackGameEvent({
              event: "games.open.direct",
              surface: "games_detail",
              gameSlug: slug,
              href: playPath
            })
          }
        >
          Play Fullscreen
        </Link>
      </header>

      <div className="overflow-hidden rounded-3xl border border-illuvrse-border bg-white shadow-card">
        <iframe
          title={`${title} embed`}
          src={embedPath}
          className="h-[70vh] w-full"
          loading="lazy"
          onLoad={() =>
            void trackGameEvent({
              event: "game.embed.load",
              surface: "games_detail",
              gameSlug: slug,
              href: embedPath
            })
          }
        />
      </div>
    </div>
  );
}
