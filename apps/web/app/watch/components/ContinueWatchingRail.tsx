/**
 * Continue watching rail (localStorage).
 */
"use client";

import { useEffect, useState } from "react";
import RailRow from "./RailRow";
import PosterCard from "./PosterCard";

const STORAGE_KEY = "illuvrse_watch_progress";

type ProgressEntry = {
  episodeId: string;
  showSlug: string;
  showTitle: string;
  episodeTitle: string;
  posterUrl?: string | null;
  updatedAt: number;
};

export default function ContinueWatchingRail() {
  const [items, setItems] = useState<ProgressEntry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, ProgressEntry>;
      const list = Object.values(parsed)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10);
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <RailRow title="Continue Watching">
      {items.map((item) => (
        <PosterCard
          key={item.episodeId}
          title={item.showTitle}
          subtitle={item.episodeTitle}
          imageUrl={item.posterUrl}
          href={`/watch/episode/${item.episodeId}`}
        />
      ))}
    </RailRow>
  );
}
