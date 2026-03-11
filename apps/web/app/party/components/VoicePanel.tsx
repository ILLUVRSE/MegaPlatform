/**
 * LiveKit stub voice panel for party sessions.
 * Request/response: toggles mock connection and mute state.
 * Guard: client component; relies on browser events.
 */
"use client";

import { useState } from "react";
import { connectToLiveKit, disconnectFromLiveKit, toggleMute } from "../lib/livekit";

export default function VoicePanel({ code }: { code: string }) {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const connect = async () => {
    try {
      setBusy(true);
      setStatus(null);
      const state = await connectToLiveKit(code);
      setConnected(state.connected);
      setMuted(state.muted);
      if (state.error) {
        setStatus(state.error);
      } else if (state.mode === "sdk") {
        setStatus("Connected to LiveKit room.");
      } else {
        setStatus("Voice token acquired.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to connect voice.");
      setConnected(false);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    try {
      setBusy(true);
      const state = await disconnectFromLiveKit();
      setConnected(state.connected);
      setMuted(state.muted);
      setStatus("Disconnected.");
    } finally {
      setBusy(false);
    }
  };

  const flipMute = async () => {
    setBusy(true);
    const next = await toggleMute(muted);
    setMuted(next);
    setBusy(false);
  };

  return (
    <div className="party-card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Voice</p>
        <h3 className="text-xl font-semibold">LiveKit Ready</h3>
        <p className="text-sm text-illuvrse-muted">
          Uses server-issued tokens and connects with LiveKit SDK when available.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {connected ? (
          <button
            type="button"
            className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            onClick={disconnect}
            disabled={busy}
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
            onClick={connect}
            disabled={busy}
          >
            Connect
          </button>
        )}
        <button
          type="button"
          className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          onClick={flipMute}
          disabled={!connected || busy}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
      {status ? <p className="text-xs text-illuvrse-muted">{status}</p> : null}
    </div>
  );
}
