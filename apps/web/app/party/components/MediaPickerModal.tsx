/**
 * Media picker modal for shows/seasons/episodes browsing and searching.
 * Request/response: fetches media APIs and emits selected episodes.
 * Guard: client component; requires fetch in browser.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

export type MediaEpisode = {
  id: string;
  title: string;
  assetUrl: string;
  showTitle?: string;
  seasonNumber?: number;
};

type MediaPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (episode: MediaEpisode) => void;
};

type Show = { id: string; title: string; slug: string; heroUrl: string | null };
type Season = { id: string; number: number; title: string };

type Episode = { id: string; title: string; assetUrl: string; lengthSeconds?: number };

export default function MediaPickerModal({ open, onClose, onAdd }: MediaPickerModalProps) {
  const [tab, setTab] = useState<"shows" | "episodes">("shows");
  const [search, setSearch] = useState("");
  const [shows, setShows] = useState<Show[]>([]);
  const [episodes, setEpisodes] = useState<MediaEpisode[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    if (!open) return;
    const loadShows = async () => {
      const response = await fetch("/api/media/shows");
      if (!response.ok) return;
      const payload = (await response.json()) as { data: Show[] };
      setShows(payload.data ?? []);
    };
    void loadShows();
  }, [open]);

  useEffect(() => {
    if (!open || !selectedShow) return;
    const loadSeasons = async () => {
      const response = await fetch(`/api/media/shows/${selectedShow.id}/seasons`);
      if (!response.ok) return;
      const payload = (await response.json()) as { data: Season[] };
      setSeasons(payload.data ?? []);
    };
    void loadSeasons();
  }, [open, selectedShow]);

  useEffect(() => {
    if (!open || !selectedSeason) return;
    const loadEpisodes = async () => {
      const response = await fetch(`/api/media/seasons/${selectedSeason.id}/episodes`);
      if (!response.ok) return;
      const payload = (await response.json()) as { data: Episode[] };
      setSeasonEpisodes(payload.data ?? []);
    };
    void loadEpisodes();
  }, [open, selectedSeason]);

  useEffect(() => {
    if (!open || tab !== "episodes") return;
    const loadEpisodes = async () => {
      const response = await fetch(`/api/media/episodes?query=${encodeURIComponent(search)}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { data: MediaEpisode[] };
      setEpisodes(payload.data ?? []);
    };
    void loadEpisodes();
  }, [open, tab, search]);

  const filteredShows = useMemo(() => {
    if (!search || tab !== "shows") return shows;
    const lowered = search.toLowerCase();
    return shows.filter((show) => show.title.toLowerCase().includes(lowered));
  }, [shows, search, tab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-4xl rounded-3xl border border-illuvrse-border bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Media Picker</p>
            <h3 className="text-xl font-semibold">Add episodes to the playlist</h3>
          </div>
          <button
            type="button"
            className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            onClick={onClose}
            data-testid="media-close"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest",
              tab === "shows"
                ? "bg-illuvrse-primary text-white"
                : "border border-illuvrse-border"
            )}
            onClick={() => setTab("shows")}
            data-testid="media-tab-shows"
          >
            Shows
          </button>
          <button
            type="button"
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest",
              tab === "episodes"
                ? "bg-illuvrse-primary text-white"
                : "border border-illuvrse-border"
            )}
            onClick={() => setTab("episodes")}
            data-testid="media-tab-episodes"
          >
            Episodes
          </button>
          <input
            className="ml-auto w-60 rounded-full border border-illuvrse-border px-4 py-2 text-sm"
            placeholder="Search..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {tab === "shows" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr_1fr]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Shows</p>
              {filteredShows.map((show) => (
                <button
                  key={show.id}
                  type="button"
                  className={clsx(
                    "w-full rounded-2xl border px-4 py-3 text-left",
                    selectedShow?.id === show.id
                      ? "border-illuvrse-primary bg-illuvrse-primary bg-opacity-10"
                      : "border-illuvrse-border"
                  )}
                  onClick={() => {
                    setSelectedShow(show);
                    setSelectedSeason(null);
                    setSeasonEpisodes([]);
                  }}
                >
                  <p className="font-semibold">{show.title}</p>
                  <p className="text-xs text-illuvrse-muted">{show.slug}</p>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Seasons</p>
              {seasons.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  className={clsx(
                    "w-full rounded-2xl border px-4 py-3 text-left",
                    selectedSeason?.id === season.id
                      ? "border-illuvrse-primary bg-illuvrse-primary bg-opacity-10"
                      : "border-illuvrse-border"
                  )}
                  onClick={() => setSelectedSeason(season)}
                >
                  <p className="font-semibold">Season {season.number}</p>
                  <p className="text-xs text-illuvrse-muted">{season.title}</p>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Episodes</p>
              {seasonEpisodes.map((episode) => (
                <div key={episode.id} className="rounded-2xl border border-illuvrse-border p-3">
                  <p className="font-semibold">{episode.title}</p>
                  <p className="text-xs text-illuvrse-muted">{episode.assetUrl}</p>
                  <button
                    type="button"
                    className="mt-2 rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                    onClick={() =>
                      onAdd({
                        id: episode.id,
                        title: episode.title,
                        assetUrl: episode.assetUrl,
                        showTitle: selectedShow?.title,
                        seasonNumber: selectedSeason?.number
                      })
                    }
                    data-testid={`media-add-${episode.id}`}
                  >
                    Add to Playlist
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {episodes.map((episode) => (
              <div key={episode.id} className="rounded-2xl border border-illuvrse-border p-4">
                <p className="font-semibold">{episode.title}</p>
                <p className="text-xs text-illuvrse-muted">
                  {episode.showTitle ? `${episode.showTitle} · Season ${episode.seasonNumber}` : ""}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                  onClick={() => onAdd(episode)}
                  data-testid={`media-add-${episode.id}`}
                >
                  Add to Playlist
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
