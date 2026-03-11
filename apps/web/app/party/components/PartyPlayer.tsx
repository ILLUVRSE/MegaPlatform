/**
 * Party playback panel with leader sync controls and display.
 * Request/response: triggers playback API calls and renders current state.
 * Guard: client component; requires browser timers.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyDriftCorrection, estimatePlaybackPosition } from "../lib/playback";

export type PlaybackSnapshot = {
  currentIndex: number;
  playbackState: "idle" | "playing" | "paused";
  leaderTime?: number;
  playbackPositionMs?: number;
  leaderId?: string | null;
};

type PlaylistItem = {
  id: string;
  order: number;
  episode?: {
    id: string;
    title: string;
    assetUrl: string;
  } | null;
  assetUrl?: string;
};

type PartyPlayerProps = {
  code: string;
  isHost: boolean;
  playback: PlaybackSnapshot;
  onPlaybackChange: (next: PlaybackSnapshot) => void;
  refreshKey: number;
};

export default function PartyPlayer({
  code,
  isHost,
  playback,
  onPlaybackChange,
  refreshKey
}: PartyPlayerProps) {
  const [positionMs, setPositionMs] = useState(playback.playbackPositionMs ?? 0);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [memeStatus, setMemeStatus] = useState<"idle" | "pending" | "done">("idle");
  const positionRef = useRef(positionMs);

  const activeItem = useMemo(
    () => playlist.find((item) => item.order === playback.currentIndex),
    [playlist, playback.currentIndex]
  );

  useEffect(() => {
    if (playback.playbackPositionMs !== undefined) {
      setPositionMs(playback.playbackPositionMs);
    }
  }, [playback.playbackPositionMs]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/party/${code}/playlist`);
      if (!response.ok) return;
      const payload = (await response.json()) as { items: PlaylistItem[] };
      setPlaylist(payload.items ?? []);
    };
    void load();
  }, [code, refreshKey]);

  useEffect(() => {
    positionRef.current = positionMs;
  }, [positionMs]);

  useEffect(() => {
    if (!isHost && playback.leaderTime && playback.playbackPositionMs !== undefined) {
      const target = estimatePlaybackPosition(
        playback.leaderTime,
        playback.playbackPositionMs,
        Date.now()
      );
      setPositionMs((current) => applyDriftCorrection(current, target));
    }
  }, [isHost, playback.leaderTime, playback.playbackPositionMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playback.playbackState !== "playing") return;
      setPositionMs((current) => current + 500);
    }, 500);
    return () => clearInterval(interval);
  }, [playback.playbackState]);

  useEffect(() => {
    if (!isHost || playback.playbackState !== "playing") return;
    const interval = setInterval(() => {
      void sendPlayback("heartbeat", {
        leaderTime: Date.now(),
        playbackPositionMs: positionRef.current,
        currentIndex: playback.currentIndex,
        playbackState: playback.playbackState
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isHost, playback.playbackState, playback.currentIndex]);

  const sendPlayback = async (
    action: "heartbeat" | "play" | "pause" | "resume" | "advance",
    override?: Partial<PlaybackSnapshot>
  ) => {
    if (action === "advance" && playlist.length === 0) return;
    const payload = {
      action,
      leaderTime: Date.now(),
      playbackPositionMs: positionMs,
      currentIndex: playback.currentIndex,
      playbackState: playback.playbackState,
      ...override
    };

    const response = await fetch(`/api/party/${code}/playback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return;
    const next = (await response.json()) as PlaybackSnapshot;
    onPlaybackChange({ ...playback, ...next });
    if (next.playbackPositionMs !== undefined) {
      setPositionMs(next.playbackPositionMs);
    }
  };

  const handleMemeThis = async () => {
    const sourceUrl = activeItem?.episode?.assetUrl ?? activeItem?.assetUrl;
    if (!sourceUrl || memeStatus === "pending") return;
    setMemeStatus("pending");

    const projectResponse = await fetch("/api/studio/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "MEME",
        title: `Party Meme ${code}`,
        description: "Generated from party playback"
      })
    });

    if (!projectResponse.ok) {
      setMemeStatus("idle");
      return;
    }

    const projectPayload = (await projectResponse.json()) as { project: { id: string } };
    const projectId = projectPayload.project.id;
    const isImage = /\.(png|jpg|jpeg|webp)$/i.test(sourceUrl);
    const isVideo = /\.(mp4)$/i.test(sourceUrl);
    if (!isImage && !isVideo) {
      setMemeStatus("idle");
      return;
    }

    const jobPayload = isImage
      ? { type: "MEME_RENDER", input: { sourceUrl, caption: "ILLUVRSE" } }
      : { type: "VIDEO_CLIP_EXTRACT", input: { sourceUrl, caption: "ILLUVRSE" } };

    const jobResponse = await fetch(`/api/studio/projects/${projectId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobPayload)
    });

    setMemeStatus(jobResponse.ok ? "done" : "idle");
  };

  return (
    <div className="party-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Now Playing</p>
          <h3 className="text-xl font-semibold" data-testid="playback-track">
            {activeItem
              ? `Episode ${activeItem.order + 1}: ${activeItem.episode?.title ?? "Studio Asset"}`
              : "No playlist item"}
          </h3>
          <p className="text-sm text-illuvrse-muted">
            {activeItem?.episode?.assetUrl ?? activeItem?.assetUrl ?? "Add items to play"}
          </p>
        </div>
        <div
          className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          data-testid="playback-state"
        >
          {playback.playbackState}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-illuvrse-muted">
          <span>Position</span>
          <span data-testid="playback-position">{Math.floor(positionMs / 1000)}s</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-illuvrse-border/50">
          <div
            className="h-full bg-illuvrse-primary"
            style={{ width: `${Math.min(100, (positionMs % 60000) / 600)}%` }}
          />
        </div>
      </div>
      {isHost ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            onClick={() =>
              sendPlayback(playback.playbackState === "playing" ? "pause" : "play", {
                playbackState: playback.playbackState === "playing" ? "paused" : "playing"
              })
            }
          >
            {playback.playbackState === "playing" ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
            onClick={() =>
              sendPlayback("advance", {
                currentIndex: Math.min(playlist.length - 1, playback.currentIndex + 1),
                playbackPositionMs: 0
              })
            }
          >
            Next Track
          </button>
          <button
            type="button"
            className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            onClick={handleMemeThis}
            disabled={memeStatus === "pending"}
          >
            {memeStatus === "pending" ? "Memeing" : memeStatus === "done" ? "Queued" : "Meme This"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-xs text-illuvrse-muted">
          <span>Following host {playback.leaderId ? `(${playback.leaderId.slice(0, 6)})` : ""}.</span>
          <button
            type="button"
            className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]"
            onClick={handleMemeThis}
            disabled={memeStatus === "pending"}
          >
            {memeStatus === "pending" ? "Memeing" : memeStatus === "done" ? "Queued" : "Meme This"}
          </button>
        </div>
      )}
    </div>
  );
}
