/**
 * Episode playback client.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";
import type { WatchChapterMarker } from "@/lib/watchChapterMarkers";
import ChapterMarkers from "../../components/ChapterMarkers";
import PosterCard from "../../components/PosterCard";

const STORAGE_KEY = "illuvrse_watch_progress";

export default function EpisodePlayer({
  episode,
  show,
  season,
  chapterMarkers,
  nextEpisodes,
  initialPositionSec,
  enableDbProgress,
  access
}: {
  episode: {
    id: string;
    title: string;
    description?: string | null;
    lengthSeconds: number;
    assetUrl: string;
  };
  show: {
    title: string;
    slug: string;
    posterUrl?: string | null;
  };
  season: {
    number: number;
    title: string;
  };
  chapterMarkers: WatchChapterMarker[];
  nextEpisodes: Array<{ id: string; title: string; description?: string | null }>;
  initialPositionSec?: number | null;
  enableDbProgress: boolean;
  access: { allowed: boolean; reason: "ok" | "sign_in_required" | "kids_restricted" };
}) {
  const [progress, setProgress] = useState<{ currentTime: number; duration: number } | null>(null);
  const [localResumeSec, setLocalResumeSec] = useState<number | null>(null);
  const lastSavedAt = useRef(0);
  const resumeSec = initialPositionSec ?? localResumeSec;

  useEffect(() => {
    if (enableDbProgress) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, any>;
      const entry = parsed[episode.id];
      if (entry?.time) {
        setLocalResumeSec(Math.floor(Number(entry.time)));
        lastSavedAt.current = Date.now();
      }
    } catch {
      // ignore
    }
  }, [episode.id, enableDbProgress]);

  useEffect(() => {
    if (!progress) return;
    if (progress.duration <= 0) return;

    const now = Date.now();
    if (now - lastSavedAt.current < 5000) return;

    const entry = {
      episodeId: episode.id,
      showSlug: show.slug,
      showTitle: show.title,
      episodeTitle: episode.title,
      posterUrl: show.posterUrl ?? null,
      time: progress.currentTime,
      updatedAt: Date.now()
    };

    if (enableDbProgress) {
      fetch("/api/watch/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId: episode.id,
          positionSec: Math.floor(progress.currentTime),
          durationSec: Math.floor(progress.duration)
        })
      }).catch(() => {});
      lastSavedAt.current = Date.now();
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      parsed[episode.id] = entry;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      lastSavedAt.current = Date.now();
    } catch {
      // ignore
    }
  }, [progress, episode.id, episode.title, show.slug, show.title, show.posterUrl]);

  return (
    <div className="space-y-6">
      {access.allowed && episode.assetUrl ? (
        <VideoPlayer
          src={episode.assetUrl}
          controls
          onProgress={(payload) => setProgress(payload)}
          initialTimeSec={resumeSec ?? undefined}
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 text-sm text-white/60">
          <p>
            {access.reason === "sign_in_required"
              ? "Sign in to watch this premium episode."
              : access.reason === "kids_restricted"
                ? "This title is restricted on the selected kids profile."
                : "Content not available yet."}
          </p>
          {access.reason === "sign_in_required" ? (
            <Link
              href="/auth/signin?callbackUrl=/watch"
              className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      )}
      <div className="space-y-2">
        {resumeSec && resumeSec > 0 ? (
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Resuming at {Math.floor(resumeSec / 60)}:{`${Math.floor(resumeSec % 60)}`.padStart(2, "0")}
          </p>
        ) : null}
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Season {season.number}
        </p>
        <h1 className="text-2xl font-semibold text-white">{episode.title}</h1>
        <p className="text-sm text-white/70">{episode.description}</p>
      </div>

      <ChapterMarkers markers={chapterMarkers} />

      {nextEpisodes.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Up Next</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3">
            {nextEpisodes.map((item) => (
              <PosterCard
                key={item.id}
                title={show.title}
                subtitle={item.title}
                imageUrl={show.posterUrl}
                href={`/watch/episode/${item.id}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
