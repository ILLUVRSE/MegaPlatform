"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GAMEGRID_TEMPLATES, estimateDifficultyLabel } from "@/lib/minigame/gamegrid";
import type { MinigameSpec } from "@/lib/minigame/spec";
import { getOrCreateOwnerKey } from "@/lib/gamegrid/owner";

type UserGame = {
  id: string;
  title: string;
  description: string | null;
  templateId: string;
  status: "DRAFT" | "PUBLISHED";
  thumbnailUrl: string | null;
  specJson: MinigameSpec;
};

export default function GameGridMyPage() {
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const ownerKey = getOrCreateOwnerKey();
    fetch("/api/gamegrid/games/my", {
      headers: ownerKey ? { "x-owner-key": ownerKey } : undefined
    })
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
      <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#1c2a1a,#0b140d_60%)] p-6 text-white shadow-card">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">My GameGrid</p>
        <h1 className="font-display text-3xl font-semibold">Your Drafts & Publishes</h1>
        <p className="text-sm text-white/70">Jump back into what you were building.</p>
        <Link className="party-button mt-4 inline-flex w-fit" href="/games/create">
          + New Game
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-illuvrse-muted">Loading your games...</p>
      ) : games.length === 0 ? (
        <p className="text-sm text-illuvrse-muted">No drafts yet. Start with /games/create.</p>
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
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/20 px-3 py-1 text-white/70">{difficulty}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">{game.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link className="party-button inline-flex w-fit" href={`/games/user/${game.id}`}>
                      Play
                    </Link>
                    {game.status === "DRAFT" ? (
                      <Link className="party-button inline-flex w-fit" href={`/games/create?edit=${game.id}`}>
                        Edit
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
