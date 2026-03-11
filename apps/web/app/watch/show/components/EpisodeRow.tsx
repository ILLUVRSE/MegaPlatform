/**
 * Episode row card.
 */
import Link from "next/link";

export default function EpisodeRow({
  episode,
  index
}: {
  episode: {
    id: string;
    title: string;
    description?: string | null;
    lengthSeconds: number;
  };
  index: number;
}) {
  const minutes = Math.round(episode.lengthSeconds / 60);

  return (
    <Link
      href={`/watch/episode/${episode.id}`}
      className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white transition hover:border-white/30"
    >
      <div className="flex h-24 w-32 items-center justify-center rounded-xl bg-white/10 text-xs font-semibold">
        EP {index}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold">{episode.title}</h3>
          <span className="text-xs text-white/60">{minutes}m</span>
        </div>
        <p className="text-xs text-white/60 line-clamp-2">{episode.description}</p>
      </div>
    </Link>
  );
}
