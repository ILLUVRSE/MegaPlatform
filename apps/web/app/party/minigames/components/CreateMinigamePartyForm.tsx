"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePartyIdentity } from "../lib/storage";

export default function CreateMinigamePartyForm() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!playerName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/party/minigames/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create room");
      }
      savePartyIdentity(data.code, {
        playerId: data.playerId,
        playerName: playerName.trim(),
        isHost: true
      });
      router.push(`/party/minigames/${data.code}/host`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="host-name"
          className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted"
        >
          Host Name
        </label>
        <input
          id="host-name"
          className="mt-2 w-full rounded-2xl border border-illuvrse-border bg-white px-4 py-2 text-sm"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Player name"
          maxLength={32}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-illuvrse-primary px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white"
      >
        {loading ? "Creating..." : "Create Room"}
      </button>
      {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
    </form>
  );
}
