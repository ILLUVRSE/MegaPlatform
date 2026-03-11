/**
 * Party host creation page with form for seat count and playlist.
 * Request/response: POSTs to /api/party/create and routes to host view.
 * Guard: none; public for now.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PlaylistEditor, { type PlaylistDraftItem } from "../components/PlaylistEditor";
import { setHostForCode } from "../lib/storage";

export default function PartyCreatePage() {
  const router = useRouter();
  const [name, setName] = useState("Weekend Watch");
  const [seatCount, setSeatCount] = useState(12);
  const [isPublic, setIsPublic] = useState(true);
  const [playlistItems, setPlaylistItems] = useState<PlaylistDraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/party/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        seatCount,
        isPublic
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to create party" }));
      setError(payload.error ?? "Failed to create party");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { code: string; partyId: string; hostId: string };
    setHostForCode(payload.code, payload.hostId);

    if (playlistItems.length > 0) {
      await fetch(`/api/party/${payload.code}/playlist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: playlistItems.map((item, index) => ({ episodeId: item.episodeId, order: index }))
        })
      });
    }

    router.push(`/party/${payload.code}/host`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="party-card">
        <h2 className="text-2xl font-semibold">Create a party session</h2>
        <p className="mt-2 text-sm text-illuvrse-muted">
          Configure your seats and playlist, then invite others with the generated code.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            Party name
            <input
              className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Seat count (6-24)
              <input
                type="number"
                min={6}
                max={24}
                className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
                value={seatCount}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setSeatCount(Math.min(24, Math.max(6, next)));
                }}
                required
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-illuvrse-border bg-white px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
              Party is public
            </label>
          </div>
          <PlaylistEditor initialItems={playlistItems} onChange={setPlaylistItems} />
          {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
          <button
            className="rounded-full bg-illuvrse-primary px-6 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create party"}
          </button>
        </form>
      </section>
      <section className="party-card space-y-3 text-sm text-illuvrse-muted">
        <h3 className="text-lg font-semibold text-illuvrse-text">Host checklist</h3>
        <ul className="space-y-2">
          <li>Seat reservations expire after 30 seconds without refresh.</li>
          <li>Playback heartbeat publishes every 2 seconds while playing.</li>
          <li>Hosts can lock seats and advance playlist entries.</li>
        </ul>
      </section>
    </div>
  );
}
