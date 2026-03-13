/**
 * Show detail client shell with season selector.
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { WatchChapterMarker } from "@/lib/watchChapterMarkers";
import type { PartyLaunchMode } from "@/lib/watchParty";
import { formatWatchPrice, getWatchMonetizationLabel, type WatchMonetizationMode } from "@/lib/watchMonetization";
import EpisodeRow from "./EpisodeRow";

type Episode = {
  id: string;
  title: string;
  description?: string | null;
  lengthSeconds: number;
  assetUrl: string;
  monetizationMode: WatchMonetizationMode;
  priceCents: number | null;
  currency: string | null;
  adsEnabled: boolean;
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
  chapterMarkers: WatchChapterMarker[];
  premiereState?: "VOD" | "UPCOMING" | "LIVE";
  premiereStartsAt?: string | null;
  partyEnabled: boolean;
  defaultPartyMode: PartyLaunchMode;
};

type Season = {
  id: string;
  number: number;
  title: string;
};

type ShowExtra = {
  id: string;
  type: "BEHIND_THE_SCENES" | "COMMENTARY" | "BONUS_CLIP" | "TRAILER";
  title: string;
  description?: string | null;
  assetUrl: string | null;
  runtimeSeconds: number | null;
};

type ShowDetailClientProps = {
  show: {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    posterUrl?: string | null;
    heroUrl?: string | null;
    monetizationMode: WatchMonetizationMode;
    priceCents: number | null;
    currency: string | null;
    adsEnabled: boolean;
  };
  seasons: Season[];
  episodesBySeason: Record<string, Episode[]>;
  isSaved: boolean;
  resumeText: string | null;
  canSave: boolean;
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
  comingSoonText: string | null;
  extras: ShowExtra[];
};

function formatExtraType(type: ShowExtra["type"]) {
  switch (type) {
    case "BEHIND_THE_SCENES":
      return "Behind the Scenes";
    case "COMMENTARY":
      return "Commentary";
    case "BONUS_CLIP":
      return "Bonus Clip";
    case "TRAILER":
      return "Trailer";
    default:
      return type;
  }
}

function formatRuntime(runtimeSeconds: number | null) {
  if (!runtimeSeconds) {
    return "Runtime TBD";
  }
  const minutes = Math.floor(runtimeSeconds / 60);
  const seconds = runtimeSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function ShowDetailClient({
  show,
  seasons,
  episodesBySeason,
  isSaved,
  resumeText,
  canSave,
  access,
  comingSoonText,
  extras
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
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/75">
          {getWatchMonetizationLabel(show)}
        </span>
        {formatWatchPrice(show.priceCents, show.currency) ? (
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100">
            {formatWatchPrice(show.priceCents, show.currency)}
          </span>
        ) : null}
      </div>
      {!access.allowed ? (
        <div className="rounded-2xl border border-amber-200/30 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
          {access.reason === "sign_in_required"
            ? show.monetizationMode === "TICKETED"
              ? "Sign in to unlock this ticketed show."
              : "Sign in to watch premium episodes on this show."
            : access.reason === "kids_restricted"
              ? "This title is restricted on the selected kids profile."
              : access.reason === "entitlement_required"
                ? show.monetizationMode === "TICKETED"
                  ? "This ticketed show requires a matching entitlement before playback."
                  : "This show requires a matching entitlement before playback."
                : "This show is not available in your current region."}
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
            <EpisodeRow key={episode.id} episode={episode} index={index + 1} showSlug={show.slug} />
          ))
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Extras</h2>
          <span className="text-xs uppercase tracking-[0.24em] text-white/45">Studio bonus drops</span>
        </div>
        {extras.length === 0 ? (
          <p className="text-sm text-white/60">No extras available yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {extras.map((extra) => (
              <div
                key={extra.id}
                className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">
                      {formatExtraType(extra.type)}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-white">{extra.title}</h3>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    {formatRuntime(extra.runtimeSeconds)}
                  </span>
                </div>
                <p className="text-sm text-white/65">{extra.description || "Open the extra clip."}</p>
                {extra.assetUrl ? (
                  <a
                    href={extra.assetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-cyan-200/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100 transition hover:border-cyan-200/60"
                  >
                    Watch Extra
                  </a>
                ) : (
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Sign in with an eligible profile to open this extra.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
