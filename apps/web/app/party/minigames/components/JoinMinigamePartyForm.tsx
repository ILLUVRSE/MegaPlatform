"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePartyIdentity } from "../lib/storage";

export default function JoinMinigamePartyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode || !playerName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/party/minigames/${trimmedCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to join room");
      }
      savePartyIdentity(trimmedCode, {
        playerId: data.playerId,
        playerName: playerName.trim(),
        isHost: false
      });
      router.push(`/party/minigames/${trimmedCode}/play`);
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
          htmlFor="room-code"
          className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted"
        >
          Room Code
        </label>
        <input
          id="room-code"
          className="mt-2 w-full rounded-2xl border border-illuvrse-border bg-white px-4 py-2 text-sm"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="ABC123"
          maxLength={6}
        />
      </div>
      <div>
        <label
          htmlFor="player-name"
          className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted"
        >
          Player Name
        </label>
        <input
          id="player-name"
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
        className="rounded-full border border-illuvrse-border px-5 py-2 text-xs font-semibold uppercase tracking-widest"
      >
        {loading ? "Joining..." : "Join Room"}
      </button>
      {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
    </form>
  );
}
