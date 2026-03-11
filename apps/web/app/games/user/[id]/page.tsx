"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MinigameFrame from "@/src/domains/creator/games/components/MinigameFrame";
import type { MinigameSpec } from "@/lib/minigame/spec";

type UserGame = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED";
  specJson: MinigameSpec;
};

export default function UserGamePage() {
  const params = useParams();
  const id = params?.id as string;
  const [game, setGame] = useState<UserGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetch(`/api/gamegrid/games/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setGame(data.game ?? null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p className="text-sm text-illuvrse-muted">Loading game...</p>;
  }

  if (!game) {
    return <p className="text-sm text-illuvrse-muted">Game not found.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#2b1a2f,#120b16_60%)] p-6 text-white shadow-card">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">GameGrid</p>
        <h1 className="font-display text-3xl font-semibold">{game.title}</h1>
        <p className="text-sm text-white/70">{game.description ?? ""}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="party-button inline-flex w-fit" href="/games/community">
            Browse Community
          </Link>
          {game.status === "PUBLISHED" ? (
            <Link className="party-button inline-flex w-fit" href={`/games/party?gamegridId=${game.id}`}>
              Use in Party
            </Link>
          ) : null}
        </div>
      </header>
      <MinigameFrame spec={game.specJson} />
    </div>
  );
}
