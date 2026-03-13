import type { WatchChapterMarker } from "@/lib/watchChapterMarkers";

function formatTimestamp(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  if (hours > 0) {
    return `${hours}:${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
  }

  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}

export default function ChapterMarkers({
  markers,
  title = "Chapters",
  compact = false
}: {
  markers: WatchChapterMarker[];
  title?: string;
  compact?: boolean;
}) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{title}</p>
        <p className="text-sm text-white/60">
          {markers.length} scene{markers.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {markers.map((marker) => (
          <div
            key={marker.sceneId}
            className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Scene {marker.sceneNumber}
              </p>
              <p className="truncate text-sm font-medium text-white">{marker.title}</p>
            </div>
            {marker.timestampSeconds !== null ? (
              <span className="shrink-0 text-xs font-medium text-white/55">
                {formatTimestamp(marker.timestampSeconds)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
