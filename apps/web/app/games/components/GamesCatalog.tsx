"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/src/domains/creator/games/catalog";
import { trackGameEvent } from "@/lib/gamesTelemetry";
import { LAYOUT_CLASS } from "@/lib/ui/layout";
import { MOTION_CLASS } from "@/lib/ui/motion";
import SurfaceCard from "@/components/ui/SurfaceCard";
import SectionHeader from "@/components/ui/SectionHeader";

type CommunityGame = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
};

export default function GamesCatalog() {
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>([]);

  useEffect(() => {
    void trackGameEvent({ event: "games.catalog.view", surface: "games_catalog", href: "/games" });

    let active = true;
    fetch("/api/gamegrid/games/community")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const games = Array.isArray(data.games) ? (data.games as CommunityGame[]) : [];
        setCommunityGames(games.slice(0, 3));
      })
      .catch(() => {
        if (!active) return;
        setCommunityGames([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Catalog"
        title="Featured Games"
        description="Jump into curated runs or explore what creators just published."
      />

      <div className={`${LAYOUT_CLASS.gridCards} md:grid-cols-3`}>
        {GAMES.map((game) => (
          <SurfaceCard
            key={game.slug}
            className={MOTION_CLASS.hoverLift + " " + MOTION_CLASS.enterFade}
          >
            <div className="h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url(${game.cover})` }} />
            <div className="space-y-3 p-4">
              <h3 className="text-lg font-semibold">{game.title}</h3>
              <p className="text-sm text-illuvrse-muted">{game.description}</p>
              <Link
                className="party-button inline-flex w-fit"
                href={`/games/${game.slug}`}
                onClick={() =>
                  void trackGameEvent({
                    event: "games.open",
                    surface: "games_catalog",
                    gameSlug: game.slug,
                    href: `/games/${game.slug}`
                  })
                }
              >
                Open
              </Link>
            </div>
          </SurfaceCard>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Community Picks</h3>
          <Link className="text-sm text-illuvrse-primary" href="/games/community">View all</Link>
        </div>
        {communityGames.length === 0 ? (
          <p className="text-sm text-illuvrse-muted">No community publishes yet.</p>
        ) : (
          <div className={`${LAYOUT_CLASS.gridCards} md:grid-cols-3`}>
            {communityGames.map((game) => (
              <SurfaceCard
                key={game.id}
                className={MOTION_CLASS.hoverLift + " " + MOTION_CLASS.enterFade}
              >
                <div
                  className="h-36 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${game.thumbnailUrl ?? "https://placehold.co/640x360?text=GameGrid"})` }}
                />
                <div className="space-y-2 p-4">
                  <h4 className="text-base font-semibold">{game.title}</h4>
                  <p className="line-clamp-2 text-sm text-illuvrse-muted">{game.description ?? "Community-built GameGrid experience."}</p>
                  <Link className="party-button inline-flex w-fit" href={`/games/user/${game.id}`}>Play</Link>
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
