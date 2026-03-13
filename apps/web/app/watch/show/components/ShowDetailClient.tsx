/**
 * Show detail client shell with season selector.
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { WatchChapterMarker } from "@/lib/watchChapterMarkers";
import EpisodeRow from "./EpisodeRow";

type Episode = {
  id: string;
  title: string;
  description?: string | null;
  lengthSeconds: number;
  assetUrl: string;
  chapterMarkers: WatchChapterMarker[];
};

type Season = {
  id: string;
  number: number;
  title: string;
};

type ShowDetailClientProps = {
  show: {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    posterUrl?: string | null;
    heroUrl?: string | null;
    isPremium?: boolean;
    price?: number | null;
  };
  seasons: Season[];
  episodesBySeason: Record<string, Episode[]>;
  isSaved: boolean;
  resumeText: string | null;
  canSave: boolean;
  access: { allowed: boolean; reason: "ok" | "sign_in_required" | "kids_restricted" };
  comingSoonText: string | null;
};

export default function ShowDetailClient({
  show,
  seasons,
  episodesBySeason,
  isSaved,
  resumeText,
  canSave,
  access,
  comingSoonText
}: ShowDetailClientProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasons[0]?.id ?? "");
  const [saved, setSaved] = useState(isSaved);

  const episodes = useMemo(() => episodesBySeason[selectedSeasonId] ?? [], [selectedSeasonId, episodesBySeason]);

  const toggleList = async () => {
    if (!canSave) return;
    const response = await fetch("/api/watch/my-list/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType: "SHOW", showId: show.id })
    });
    if (!response.ok) {
      if (response.status === 401) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (payload.error === "Select profile") {
          window.location.href = "/watch/profiles";
        } else {
          window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(`/watch/show/${show.slug}`)}`;
        }
      }
      return;
    }
    const payload = (await response.json()) as { saved: boolean };
    setSaved(payload.saved);
  };

  return (
    <div className="space-y-6">
      {!access.allowed ? (
        <div className="rounded-2xl border border-amber-200/30 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
          {access.reason === "sign_in_required"
            ? "Sign in to watch premium episodes on this show."
            : "This title is restricted on the selected kids profile."}
        </div>
      ) : null}
      {comingSoonText ? (
        <div className="rounded-2xl border border-cyan-200/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
          {comingSoonText}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
          onClick={() => {
            const firstEpisode = episodes[0];
            if (firstEpisode) {
              window.location.href = `/watch/episode/${firstEpisode.id}`;
            }
          }}
          disabled={!access.allowed}
        >
          Play
        </button>
        <button
          type="button"
          className="rounded-full border border-white/40 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50"
          onClick={toggleList}
          disabled={!canSave}
        >
          {saved ? "Remove from List" : "Add to List"}
        </button>
        <Link
          href="/watch"
          className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white/70"
        >
          Back
        </Link>
      </div>

      {resumeText ? <p className="text-sm text-white/60">{resumeText}</p> : null}

      {seasons.length > 0 ? (
        <label className="flex items-center gap-3 text-sm font-semibold text-white">
          Season
          <select
            className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-sm"
            value={selectedSeasonId}
            onChange={(event) => setSelectedSeasonId(event.target.value)}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="space-y-3">
        {episodes.length === 0 ? (
          <p className="text-sm text-white/60">No episodes available yet.</p>
        ) : (
          episodes.map((episode, index) => (
            <EpisodeRow key={episode.id} episode={episode} index={index + 1} />
          ))
        )}
      </div>
    </div>
  );
}
