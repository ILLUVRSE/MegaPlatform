/**
 * Episode row card.
 */
import Link from "next/link";
import type { WatchChapterMarker } from "@/lib/watchChapterMarkers";
import ChapterMarkers from "../../components/ChapterMarkers";

export default function EpisodeRow({
  episode,
  index
}: {
  episode: {
    id: string;
    title: string;
    description?: string | null;
    lengthSeconds: number;
    chapterMarkers: WatchChapterMarker[];
    premiereState?: "VOD" | "UPCOMING" | "LIVE";
    premiereStartsAt?: string | null;
  };
  index: number;
}) {
  const minutes = Math.round(episode.lengthSeconds / 60);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <Link href={`/watch/episode/${episode.id}`} className="flex gap-4 transition hover:opacity-90">
        <div className="flex h-24 w-32 items-center justify-center rounded-xl bg-white/10 text-xs font-semibold">
          EP {index}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">{episode.title}</h3>
            <div className="flex items-center gap-2">
              {episode.premiereState && episode.premiereState !== "VOD" ? (
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    episode.premiereState === "LIVE"
                      ? "border border-rose-300/40 bg-rose-300/12 text-rose-100"
                      : "border border-amber-300/40 bg-amber-300/12 text-amber-100"
                  }`}
                >
                  {episode.premiereState === "LIVE" ? "Live" : "Premiere"}
                </span>
              ) : null}
              <span className="text-xs text-white/60">{minutes}m</span>
            </div>
          </div>
          <p className="text-xs text-white/60 line-clamp-2">{episode.description}</p>
          {episode.premiereState === "UPCOMING" && episode.premiereStartsAt ? (
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-100/70">
              Starts {new Date(episode.premiereStartsAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      </Link>
      {episode.premiereState === "VOD" ? (
        <ChapterMarkers markers={episode.chapterMarkers} title="Chapter markers" compact />
      ) : null}
    </div>
  );
}
