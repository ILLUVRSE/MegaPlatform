/**
 * Live channel tile.
 */
import Link from "next/link";

export default function ChannelTile({
  channel
}: {
  channel: {
    id: string;
    name: string;
    logoUrl?: string | null;
    heroUrl?: string | null;
    category?: string | null;
    now?: string | null;
  };
}) {
  return (
    <Link
      href={`/watch/live/${channel.id}`}
      className="group relative flex w-56 flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-white"
    >
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={channel.heroUrl ?? "https://placehold.co/640x360?text=Live"}
          alt={channel.name}
          className="h-28 w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]">
          Live
        </span>
      </div>
      <div className="flex items-center gap-2">
        <img
          src={channel.logoUrl ?? "https://placehold.co/60x60?text=TV"}
          alt=""
          className="h-10 w-10 rounded-xl object-cover"
        />
        <div>
          <p className="text-sm font-semibold">{channel.name}</p>
          <p className="text-xs text-white/60">{channel.category ?? "Live"}</p>
        </div>
      </div>
      {channel.now ? <p className="text-xs text-white/60">Now: {channel.now}</p> : null}
    </Link>
  );
}
