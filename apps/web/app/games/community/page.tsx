"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GAMEGRID_TEMPLATES, estimateDifficultyLabel } from "@/lib/minigame/gamegrid";
import type { MinigameSpec } from "@/lib/minigame/spec";

type UserGame = {
  id: string;
  title: string;
  description: string | null;
  templateId: string;
  thumbnailUrl: string | null;
  specJson: MinigameSpec;
};

export default function GameGridCommunityPage() {
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/gamegrid/games/community")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setGames(data.games ?? []);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#1d1a2f,#0c0b16_60%)] p-6 text-white shadow-card">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Community Grid</p>
        <h1 className="font-display text-3xl font-semibold">Published GameGrid Builds</h1>
        <p className="text-sm text-white/70">Play what the community shipped this week.</p>
      </header>

      {loading ? (
        <p className="text-sm text-illuvrse-muted">Loading community games...</p>
      ) : games.length === 0 ? (
        <p className="text-sm text-illuvrse-muted">No published games yet. Be the first to ship one.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => {
            const templateName = GAMEGRID_TEMPLATES.find((template) => template.id === game.templateId)?.name ??
              game.templateId;
            const difficulty = estimateDifficultyLabel(game.specJson);
            return (
              <div key={game.id} className="rounded-2xl border border-white/20 bg-black/50 p-4">
                <div
                  className="mb-3 h-36 w-full rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url(${game.thumbnailUrl ?? ""})` }}
                />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{game.title}</h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">{templateName}</p>
                  <p className="text-sm text-white/70">{game.description ?? "No description."}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/20 px-3 py-1 text-white/70">{difficulty}</span>
                    {game.specJson.modifiers?.map((modifier) => (
                      <span key={modifier} className="rounded-full border border-white/10 px-3 py-1 text-white/60">
                        {modifier}
                      </span>
                    ))}
                  </div>
                  <Link className="party-button inline-flex w-fit" href={`/games/user/${game.id}`}>
                    Play
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
