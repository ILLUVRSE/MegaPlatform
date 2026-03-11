/**
 * Live channels grid with filters.
 */
"use client";

import { useMemo, useState } from "react";
import ChannelTile from "../../components/ChannelTile";

export default function LiveGrid({
  channels
}: {
  channels: Array<{
    id: string;
    name: string;
    logoUrl?: string | null;
    heroUrl?: string | null;
    category?: string | null;
    now?: string | null;
  }>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const unique = new Set(channels.map((item) => item.category ?? "Other"));
    return ["All", ...Array.from(unique)];
  }, [channels]);

  const filtered = useMemo(() => {
    return channels.filter((channel) => {
      const matchesCategory = category === "All" || (channel.category ?? "Other") === category;
      const matchesQuery = channel.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [channels, category, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest ${
                item === category ? "bg-white text-black" : "border border-white/20 text-white/70"
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <input
          className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white"
          placeholder="Search channels"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-white/60">No channels match those filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((channel) => (
            <ChannelTile key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
