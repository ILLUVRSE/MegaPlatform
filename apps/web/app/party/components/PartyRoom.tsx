/**
 * Party room client logic for join, SSE updates, and seat selection.
 * Request/response: talks to party APIs and renders SeatGrid + Player + VoicePanel.
 * Guard: client component; relies on EventSource and localStorage.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import SeatGrid, { type SeatSnapshot } from "./SeatGrid";
import PartyPlayer, { type PlaybackSnapshot } from "./PartyPlayer";
import VoicePanel from "./VoicePanel";
import { getOrCreateUserId } from "../lib/storage";
import {
  getPartyReconnectDelayMs,
  PARTY_RECONNECT_ATTEMPTS
} from "@/lib/partyPresence";

const RESERVATION_REFRESH_MS = 10_000;
const PRESENCE_PING_MS = Number(process.env.NEXT_PUBLIC_PARTY_PRESENCE_PING_MS ?? 10_000);

type PartyMeta = {
  partyId: string;
  code: string;
  name: string;
  seatCount: number;
  hostId: string;
  playlist?: Array<{ episodeId: string | null }>;
  playback: PlaybackSnapshot;
};

type PartyRoomProps = {
  code: string;
  isHost: boolean;
};

export default function PartyRoom({ code, isHost }: PartyRoomProps) {
  const pathname = usePathname();
  const [meta, setMeta] = useState<PartyMeta | null>(null);
  const [seatStates, setSeatStates] = useState<Record<string, SeatSnapshot>>({});
  const [playback, setPlayback] = useState<PlaybackSnapshot>({
    currentIndex: 0,
    playbackState: "idle"
  });
  const [heldSeat, setHeldSeat] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [playlistRefreshKey, setPlaylistRefreshKey] = useState(0);
  const [presenceStatus, setPresenceStatus] = useState<"online" | "reconnecting">("online");
  const [syncGeneration, setSyncGeneration] = useState(0);

  const userId = useMemo(() => getOrCreateUserId(), []);

  const applySnapshot = (snapshot: {
    seats?: Record<string, SeatSnapshot>;
    playback?: PlaybackSnapshot;
  }) => {
    setSeatStates(snapshot.seats ?? {});
    setPlayback((current) => snapshot.playback ?? current);
    const held = Object.entries(snapshot.seats ?? {}).find(
      ([, seat]) => seat.state === "reserved" && seat.userId === userId
    );
    setHeldSeat(held ? Number(held[0]) : null);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const response = await fetch(`/api/party/${code}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Failed to load party" }));
        setError(payload.error ?? "Failed to load party");
        return;
      }
      const payload = (await response.json()) as {
        party: PartyMeta;
        state: { seats: Record<string, SeatSnapshot>; playback: PlaybackSnapshot };
      };
      if (!mounted) return;
      setMeta(payload.party);
      applySnapshot({
        seats: payload.state.seats ?? {},
        playback: payload.state.playback ?? payload.party.playback
      });
      setSelectedSeat(1);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [code]);

  useEffect(() => {
    if (!meta) return;
    const activePlaylistItem = meta.playlist?.[playback.currentIndex] ?? null;
    void fetch("/api/platform/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentModule: "party",
        partyCode: code,
        href: pathname,
        action: isHost ? "host-room" : "join-room",
        state: {
          partyEpisodeId: activePlaylistItem?.episodeId ?? null
        }
      })
    }).catch(() => {});
  }, [code, isHost, meta, pathname, playback.currentIndex]);

  useEffect(() => {
    if (!code) return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/party/${code}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        party: PartyMeta;
        state: { seats: Record<string, SeatSnapshot>; playback: PlaybackSnapshot };
      };
      applySnapshot({
        seats: payload.state.seats ?? {},
        playback: payload.state.playback ?? payload.party.playback
      });
    }, 15_000);
    return () => clearInterval(interval);
  }, [code]);

  useEffect(() => {
    if (!meta) return;
    const join = async () => {
      await fetch(`/api/party/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: `Guest-${userId.slice(0, 4)}` })
      });
    };

    void join();
  }, [code, meta, userId]);

  useEffect(() => {
    if (!meta) return;
    let cancelled = false;
    const ping = async () => {
      const response = await fetch(`/api/party/${code}/presence/ping`, {
        method: "POST"
      });
      if (cancelled) return;
      setPresenceStatus(response.ok ? "online" : "reconnecting");
    };
    void ping();
    const interval = setInterval(() => {
      void ping();
    }, PRESENCE_PING_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code, meta]);

  useEffect(() => {
    if (!code) return;
    let closed = false;
    let attempt = 0;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let connectedOnce = false;
    let waitingForResume = false;

    const scheduleReconnect = () => {
      if (closed || attempt >= PARTY_RECONNECT_ATTEMPTS) {
        return;
      }
      const delayMs = getPartyReconnectDelayMs(attempt);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        connect();
      }, delayMs);
    };

    const connect = () => {
      if (closed) return;
      source = new EventSource(`/api/party/${code}/events`);
      source.onopen = () => {
        if (connectedOnce && waitingForResume) {
          setSyncGeneration((current) => current + 1);
        }
        connectedOnce = true;
        waitingForResume = false;
        attempt = 0;
        setPresenceStatus("online");
      };
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type: string;
            seatIndex?: number;
            userId?: string | null;
            leaderTime?: number;
            playbackPositionMs?: number;
            currentIndex?: number;
            playbackState?: PlaybackSnapshot["playbackState"];
            leaderId?: string;
            timelineRevision?: number;
            syncSequence?: number;
            softLockUntil?: number;
            lastAction?: PlaybackSnapshot["lastAction"];
            lastHeartbeatAt?: number;
            state?: unknown;
          };

          if (payload.type === "snapshot") {
            applySnapshot(
              (payload.state as { seats?: Record<string, SeatSnapshot>; playback?: PlaybackSnapshot }) ?? {}
            );
            return;
          }

          if (payload.type === "seat_update" && payload.seatIndex) {
            const seatState = payload.state as SeatSnapshot["state"] | undefined;
            setSeatStates((prev) => ({
              ...prev,
              [String(payload.seatIndex)]: {
                state: seatState ?? "available",
                userId: payload.userId ?? null
              }
            }));
          }

          if (payload.type === "playback_update") {
            setPlayback((prev) => ({
              ...prev,
              leaderTime: payload.leaderTime,
              playbackPositionMs: payload.playbackPositionMs,
              currentIndex: payload.currentIndex ?? prev.currentIndex,
              playbackState: payload.playbackState ?? prev.playbackState,
              leaderId: payload.leaderId ?? prev.leaderId,
              timelineRevision:
                typeof payload.timelineRevision === "number"
                  ? payload.timelineRevision
                  : prev.timelineRevision,
              syncSequence:
                typeof payload.syncSequence === "number" ? payload.syncSequence : prev.syncSequence,
              softLockUntil:
                typeof payload.softLockUntil === "number" ? payload.softLockUntil : prev.softLockUntil,
              lastAction: payload.lastAction ?? prev.lastAction,
              lastHeartbeatAt:
                typeof payload.lastHeartbeatAt === "number"
                  ? payload.lastHeartbeatAt
                  : prev.lastHeartbeatAt
            }));
          }

          if (payload.type === "playlist_update") {
            setPlaylistRefreshKey((prev) => prev + 1);
          }
        } catch {
          // ignore malformed events
        }
      };

      source.onerror = () => {
        setPresenceStatus("reconnecting");
        waitingForResume = connectedOnce;
        source?.close();
        source = null;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      closed = true;
      source?.close();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [code, userId]);

  useEffect(() => {
    if (!heldSeat) return;
    const interval = setInterval(() => {
      void reserveSeat(heldSeat, true);
    }, RESERVATION_REFRESH_MS);
    return () => clearInterval(interval);
  }, [heldSeat]);

  const reserveSeat = async (seatIndex: number, refresh = false) => {
    const response = await fetch(`/api/party/${code}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIndex, refresh })
    });

    if (response.status === 409) {
      if (!refresh) {
        setError("Seat is already reserved.");
      }
      if (refresh) {
        setHeldSeat(null);
      }
      return;
    }

    if (!response.ok) {
      setError("Unable to reserve seat.");
      return;
    }

    setHeldSeat(seatIndex);
    setError(null);
  };

  const releaseSeat = async (seatIndex: number) => {
    const response = await fetch(`/api/party/${code}/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIndex })
    });

    if (!response.ok) {
      setError("Unable to release seat.");
      return;
    }

    setHeldSeat(null);
    setError(null);
  };

  const lockSeat = async (lock: boolean) => {
    const response = await fetch(`/api/party/${code}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seatIndex: selectedSeat,
        locked: lock,
        occupantId: seatStates[String(selectedSeat)]?.userId ?? null
      })
    });

    if (!response.ok) {
      setError(lock ? "Unable to lock seat." : "Unable to unlock seat.");
      return;
    }

    setError(null);
  };

  if (!meta) {
    if (error) {
      return <div className="party-card text-sm text-illuvrse-danger">{error}</div>;
    }
    return <div className="party-card">Loading party data...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        {error ? <div className="party-card text-sm text-illuvrse-danger">{error}</div> : null}
        <div className="party-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Party</p>
              <h2 className="text-2xl font-semibold">{meta.name}</h2>
              <p className="text-sm text-illuvrse-muted">Code: {meta.code}</p>
            </div>
            <div className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest">
              {isHost ? "Host" : "Guest"}
            </div>
            <div className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest">
              Presence: {presenceStatus}
            </div>
          </div>
          <SeatGrid
            seatCount={meta.seatCount}
            currentUserId={userId}
            seatStates={seatStates}
            onReserve={reserveSeat}
            onRelease={releaseSeat}
          />
          {isHost ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                Seat
                <select
                  className="rounded-xl border border-illuvrse-border bg-white px-3 py-2"
                  value={selectedSeat}
                  onChange={(event) => setSelectedSeat(Number(event.target.value))}
                >
                  {Array.from({ length: meta.seatCount }, (_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={() => void lockSeat(true)}
              >
                Lock Seat
              </button>
              <button
                type="button"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={() => void lockSeat(false)}
              >
                Unlock Seat
              </button>
            </div>
          ) : null}
        </div>
        <PartyPlayer
          code={code}
          isHost={isHost}
          playback={playback}
          onPlaybackChange={setPlayback}
          refreshKey={playlistRefreshKey}
          syncGeneration={syncGeneration}
        />
      </section>
      <section className="space-y-6">
        <VoicePanel code={code} />
        <div className="party-card space-y-2 text-sm text-illuvrse-muted">
          <h3 className="text-lg font-semibold text-illuvrse-text">Presence</h3>
          <p>World-state updates stream over SSE from Redis pub/sub.</p>
          <p>Seat reservations auto-expire after 30s if not refreshed.</p>
        </div>
      </section>
    </div>
  );
}
