/**
 * Episode playback client.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";
import { buildWatchToPartyHref } from "@/lib/journeyBridge";
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
  access,
  premiere
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
  access: {
    allowed: boolean;
    reason:
      | "ok"
      | "sign_in_required"
      | "kids_restricted"
      | "private"
      | "unlisted"
      | "region_restricted"
      | "entitlement_required";
  };
  premiere: {
    state: "VOD" | "UPCOMING" | "LIVE";
    isPremiereEnabled: boolean;
    startsAt: string | null;
    effectiveEndsAt: string | null;
    chatEnabled: boolean;
  };
}) {
  const [progress, setProgress] = useState<{ currentTime: number; duration: number } | null>(null);
  const [localResumeSec, setLocalResumeSec] = useState<number | null>(null);
  const [timeRemainingLabel, setTimeRemainingLabel] = useState<string | null>(null);
  const lastSavedAt = useRef(0);
  const resumeSec = initialPositionSec ?? localResumeSec;
  const shouldShowVodPlayer = premiere.state === "VOD";

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

  useEffect(() => {
    if (premiere.state !== "UPCOMING" || !premiere.startsAt) {
      setTimeRemainingLabel(null);
      return;
    }

    const startsAt = premiere.startsAt;
    const update = () => {
      const deltaMs = new Date(startsAt).getTime() - Date.now();
      if (deltaMs <= 0) {
        setTimeRemainingLabel("Starting now");
        return;
      }

      const totalSeconds = Math.floor(deltaMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const parts = [
        days > 0 ? `${days}d` : null,
        hours > 0 || days > 0 ? `${hours}h` : null,
        `${minutes}m`,
        `${seconds}s`
      ].filter(Boolean);
      setTimeRemainingLabel(parts.join(" "));
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [premiere.startsAt, premiere.state]);

  const premierePartyHref = buildWatchToPartyHref({ showSlug: show.slug, episodeId: episode.id });
  const premiereEndsAtText = premiere.effectiveEndsAt ? new Date(premiere.effectiveEndsAt).toLocaleString() : null;

  return (
    <div className="space-y-6">
      {shouldShowVodPlayer && access.allowed && episode.assetUrl ? (
        <VideoPlayer
          src={episode.assetUrl}
          controls
          onProgress={(payload) => setProgress(payload)}
          initialTimeSec={resumeSec ?? undefined}
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 text-sm text-white/60">
          {premiere.state === "UPCOMING" ? (
            <>
              <span className="rounded-full border border-amber-300/40 bg-amber-300/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                Premiere Soon
              </span>
              <p className="text-center text-base text-white">
                This episode premieres {premiere.startsAt ? new Date(premiere.startsAt).toLocaleString() : "soon"}.
              </p>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">
                Countdown {timeRemainingLabel ?? "calculating"}
              </p>
              {premiere.chatEnabled ? (
                <Link
                  href={premierePartyHref}
                  className="rounded-full border border-cyan-200/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100"
                >
                  Open Premiere Party
                </Link>
              ) : null}
            </>
          ) : premiere.state === "LIVE" ? (
            <>
              <span className="rounded-full border border-rose-300/40 bg-rose-300/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-100">
                Premiere Live
              </span>
              <p className="max-w-xl text-center text-base text-white">
                The live premiere shell is active. Video-on-demand playback unlocks after the premiere window closes.
              </p>
              {premiereEndsAtText ? (
                <p className="text-xs uppercase tracking-[0.24em] text-rose-100/80">VOD unlocks {premiereEndsAtText}</p>
              ) : null}
              <div className="flex flex-wrap justify-center gap-3">
                {premiere.chatEnabled ? (
                  <Link
                    href={premierePartyHref}
                    className="rounded-full border border-cyan-200/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100"
                  >
                    Join Premiere Party
                  </Link>
                ) : null}
                <Link
                  href={`/watch/show/${show.slug}`}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                >
                  Back to Show
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>
                {access.reason === "sign_in_required"
                  ? "Sign in to watch this premium episode."
                  : access.reason === "kids_restricted"
                    ? "This title is restricted on the selected kids profile."
                    : access.reason === "entitlement_required"
                      ? "This episode requires a matching entitlement before playback."
                      : access.reason === "region_restricted"
                        ? "This episode is not available in your current region."
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
            </>
          )}
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
        {premiere.isPremiereEnabled ? (
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
                premiere.state === "LIVE"
                  ? "border border-rose-300/40 bg-rose-300/12 text-rose-100"
                  : premiere.state === "UPCOMING"
                    ? "border border-amber-300/40 bg-amber-300/12 text-amber-100"
                    : "border border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
              }`}
            >
              {premiere.state === "LIVE" ? "Premiere Live" : premiere.state === "UPCOMING" ? "Premiere Scheduled" : "Premiere Replay"}
            </span>
            {premiere.startsAt ? (
              <span className="text-xs uppercase tracking-[0.24em] text-white/45">
                Starts {new Date(premiere.startsAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold text-white">{episode.title}</h1>
        <p className="text-sm text-white/70">{episode.description}</p>
      </div>

      {shouldShowVodPlayer ? <ChapterMarkers markers={chapterMarkers} /> : null}

      {shouldShowVodPlayer && nextEpisodes.length > 0 ? (
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
