"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { HudState } from "@/lib/minigame/runtime/types";
import { MinigameSnapshotRenderer } from "@/lib/minigame/runtime";
import { createControllerForSpec } from "@/lib/minigame/templates";
import { shouldPreventGameplayKey } from "@/lib/minigame/inputLock";
import MinigameHUD from "@/src/domains/creator/games/components/MinigameHUD";
import type { MinigameSpec } from "@/lib/minigame/spec";
import type { PartyEvent, PartyState } from "@/lib/minigame/party/types";
import { InputManager } from "@/lib/minigame/runtime/input";
import { clearPartyIdentity, loadPartyIdentity } from "../lib/storage";

const EMPTY_HUD: HudState = {
  timeRemaining: 0,
  objective: "",
  status: "",
  result: null
};

const formatCountdown = (startAt: number, now: number) => {
  const diff = Math.max(0, startAt - now);
  return Math.ceil(diff / 1000);
};

const formatTimer = (endAt: number, now: number) => {
  const diff = Math.max(0, endAt - now);
  return Math.ceil(diff / 1000);
};

export default function MinigamePartyRoom({ code, isHost }: { code: string; isHost: boolean }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<{ playerId: string; playerName: string } | null>(null);
  const [roomState, setRoomState] = useState<PartyState | null>(null);
  const [spec, setSpec] = useState<MinigameSpec | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<MinigameSnapshotRenderer | null>(null);
  const snapshotRef = useRef<unknown>(null);
  const hudRef = useRef<HudState>(hud);
  const inputRef = useRef<InputManager | null>(null);

  const phase = roomState?.phase ?? "LOBBY";
  const currentRound = roomState?.currentRound ?? null;
  const isPlaying = phase === "PLAYING";
  const isCountdown = phase === "COUNTDOWN" && currentRound?.startAt;
  const countdown = isCountdown && currentRound?.startAt ? formatCountdown(currentRound.startAt, now) : null;
  const roundTimer = currentRound?.endAt ? formatTimer(currentRound.endAt, now) : null;
  const player = identity ? roomState?.players[identity.playerId] : null;
  const roundsTotal = roomState?.config.roundsTotal ?? 5;
  const displayRound = currentRound ? currentRound.index + 1 : roundsTotal;
  const spectatorTargetId = useMemo(() => {
    if (!roomState) return null;
    const active = Object.values(roomState.players).filter((entry) => entry.role === "player");
    return roomState.hostId ?? active[0]?.id ?? null;
  }, [roomState]);
  const isSpectator = player?.role === "spectator";
  const inputEnabled =
    isPlaying &&
    !isSpectator &&
    Boolean(currentRound?.startAt) &&
    now >= (currentRound?.startAt ?? 0);

  useEffect(() => {
    const stored = loadPartyIdentity(code);
    if (stored) {
      setIdentity({ playerId: stored.playerId, playerName: stored.playerName });
    }
  }, [code]);

  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    fetch(`/api/party/minigames/${code}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.state) {
          setRoomState(data.state);
          if (data.state.currentRound?.spec) {
            setSpec(data.state.currentRound.spec);
          }
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [code, identity]);

  useEffect(() => {
    if (!identity) return;
    const source = new EventSource(`/api/party/minigames/${code}/events`);
    const onMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as PartyEvent;
        if (payload.type === "room_state") {
          setRoomState(payload.state);
          if (payload.state.currentRound?.spec) {
            setSpec(payload.state.currentRound.spec);
          }
        }
        if (payload.type === "round_start") {
          setSpec(payload.spec);
          setHud((prev) => ({ ...prev, result: null }));
          snapshotRef.current = null;
        }
        if (payload.type === "snapshot") {
          const isOwn = payload.playerId === identity.playerId;
          const isSpectatorView = isSpectator && payload.playerId === spectatorTargetId;
          if (isOwn || isSpectatorView) {
            snapshotRef.current = payload.state;
            setHud(payload.hud);
            setScores(payload.scores ?? {});
          }
        }
        if (payload.type === "round_end") {
          setScores(payload.scores ?? {});
        }
        if (payload.type === "session_end") {
          setScores(payload.scores ?? {});
        }
        if (payload.type === "error") {
          setError(payload.message);
        }
      } catch {
        // ignore parse errors
      }
    };
    source.addEventListener("message", onMessage);
    return () => {
      source.removeEventListener("message", onMessage);
      source.close();
    };
  }, [code, identity, isSpectator, spectatorTargetId]);

  useEffect(() => {
    hudRef.current = hud;
  }, [hud]);

  useEffect(() => {
    if (!spec || !canvasRef.current) return;
    const controller = createControllerForSpec(spec);
    const renderer = new MinigameSnapshotRenderer({
      canvas: canvasRef.current,
      spec,
      controller
    });
    rendererRef.current = renderer;
    let frameId: number;

    const loop = () => {
      if (rendererRef.current && snapshotRef.current) {
        rendererRef.current.setTimeRemaining(hudRef.current.timeRemaining);
        rendererRef.current.render(snapshotRef.current);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      rendererRef.current = null;
    };
  }, [spec]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const input = new InputManager(canvasRef.current);
    inputRef.current = input;
    return () => {
      input.destroy();
      inputRef.current = null;
    };
  }, [spec]);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.setEnabled(inputEnabled && isFocused);
    }
  }, [inputEnabled, isFocused]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!shouldPreventGameplayKey(event.code, isFocused, inputEnabled)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [inputEnabled, isFocused]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (event: WheelEvent) => {
      if (!isFocused || !inputEnabled) return;
      event.preventDefault();
    };
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [inputEnabled, isFocused]);

  useEffect(() => {
    if (!inputEnabled) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [inputEnabled]);

  useEffect(() => {
    if (!identity || !inputEnabled) return;
    const interval = setInterval(() => {
      const input = inputRef.current?.snapshot();
      if (!input) return;
      void fetch(`/api/party/minigames/${code}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: identity.playerId, t: Date.now(), input })
      });
    }, 50);
    return () => clearInterval(interval);
  }, [code, identity, inputEnabled]);

  useEffect(() => {
    if (!identity) return;
    const interval = setInterval(() => {
      void fetch(`/api/party/minigames/${code}/ping`, {
        method: "POST",
        headers: { "x-player-id": identity.playerId }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [code, identity]);

  const handleReadyToggle = async () => {
    if (!identity) return;
    const next = !player?.isReady;
    await fetch(`/api/party/minigames/${code}/ready`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": identity.playerId
      },
      body: JSON.stringify({ ready: next })
    });
  };

  const handleRoleToggle = async () => {
    if (!identity || !player) return;
    const nextRole = player.role === "player" ? "spectator" : "player";
    await fetch(`/api/party/minigames/${code}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": identity.playerId
      },
      body: JSON.stringify({ role: nextRole })
    });
  };

  const handleStartRound = async (forceStart = false) => {
    if (!identity) return;
    await fetch(`/api/party/minigames/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: identity.playerId, forceStart })
    });
  };

  const handleNextRound = async () => {
    if (!identity) return;
    await fetch(`/api/party/minigames/${code}/next-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: identity.playerId })
    });
  };

  const handleResetSession = async () => {
    if (!identity) return;
    await fetch(`/api/party/minigames/${code}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: identity.playerId })
    });
  };

  const handleEndSession = async () => {
    if (!identity) return;
    await fetch(`/api/party/minigames/${code}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: identity.playerId })
    });
    clearPartyIdentity(code);
    router.push("/party/minigames");
  };

  const handleLeave = async () => {
    if (!identity) return;
    await fetch(`/api/party/minigames/${code}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: identity.playerId })
    });
    clearPartyIdentity(code);
    router.push("/party/minigames");
  };

  const readyTimeoutReached = useMemo(() => {
    if (!roomState?.readyCheckStartedAt) return false;
    return now - roomState.readyCheckStartedAt >= roomState.config.readyTimeoutMs;
  }, [now, roomState]);

  const scoreboard = useMemo(() => {
    if (!roomState) return [];
    return Object.values(roomState.players).sort((a, b) => {
      const scoreA = scores[a.id] ?? roomState.scoreboard.partyPointsByPlayerId[a.id] ?? 0;
      const scoreB = scores[b.id] ?? roomState.scoreboard.partyPointsByPlayerId[b.id] ?? 0;
      return scoreB - scoreA;
    });
  }, [roomState, scores]);

  const lastRoundResults = roomState?.scoreboard.lastRoundResults ?? [];

  if (!identity) {
    return (
      <section className="party-card space-y-3">
        <h2 className="text-xl font-semibold">Join this room first</h2>
        <p className="text-sm text-illuvrse-muted">
          Head back to the Party Minigames lobby to set your player name.
        </p>
        <button
          className="rounded-full border border-illuvrse-border px-5 py-2 text-xs font-semibold uppercase tracking-widest"
          onClick={() => router.push("/party/minigames")}
        >
          Go to lobby
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="party-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Room</p>
          <h2 className="text-2xl font-semibold">{code}</h2>
          <p className="text-sm text-illuvrse-muted">
            Round {Math.max(1, displayRound)} / {roundsTotal} • {phase}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isHost ? (
            <>
              <button
                className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                onClick={handleReadyToggle}
                disabled={phase !== "LOBBY" && phase !== "INTERMISSION"}
              >
                {player?.isReady ? "Ready!" : "Ready"}
              </button>
              <button
                className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                onClick={() => handleStartRound(false)}
                disabled={phase !== "LOBBY" && phase !== "INTERMISSION"}
              >
                Start Round
              </button>
              <button
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={() => handleStartRound(true)}
                disabled={!readyTimeoutReached || (phase !== "LOBBY" && phase !== "INTERMISSION")}
              >
                Force Start
              </button>
              <button
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={handleEndSession}
              >
                End Session
              </button>
            </>
          ) : (
            <>
              <button
                className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                onClick={handleReadyToggle}
                disabled={phase !== "LOBBY" && phase !== "INTERMISSION"}
              >
                {player?.isReady ? "Ready!" : "Ready"}
              </button>
              <button
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={handleLeave}
              >
                Leave
              </button>
            </>
          )}
          <button
            className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            onClick={handleRoleToggle}
          >
            {isSpectator ? "Play Next Round" : "Spectate"}
          </button>
        </div>
      </section>

      {spec ? (
        <section className="party-card space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Minigame</p>
            <h3 className="text-2xl font-semibold">{spec.title}</h3>
            <p className="text-sm text-illuvrse-muted">{spec.tagline}</p>
            <p className="mt-2 text-sm">{spec.instructions}</p>
          </div>
          <MinigameHUD
            spec={spec}
            timeRemaining={hud.timeRemaining}
            objective={hud.objective}
            status={hud.status}
            result={hud.result}
          />
          <div
            ref={wrapperRef}
            className="relative rounded-3xl border border-white/20 bg-black/30 p-3 shadow-xl"
            style={{ overscrollBehavior: "contain", touchAction: "none", userSelect: "none", overflow: "hidden" }}
            tabIndex={0}
            onClick={() => {
              wrapperRef.current?.focus();
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <div className="aspect-[1080/608] w-full overflow-hidden rounded-2xl bg-black">
              <canvas ref={canvasRef} className="h-full w-full" />
            </div>
            {(!inputEnabled || !isFocused) && phase !== "INTERMISSION" && phase !== "SESSION_END" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white">
                  Click to focus
                </div>
              </div>
            ) : null}
            {countdown && countdown > 0 && phase === "COUNTDOWN" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-5xl font-semibold text-white">{countdown}</div>
              </div>
            ) : null}
            {isSpectator ? (
              <div className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white">
                Spectating
              </div>
            ) : null}
            {hud.result ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center text-white shadow-xl">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/70">Round Over</p>
                  <h3 className="mt-2 text-3xl font-semibold">
                    {hud.result === "win" ? "You Win!" : "You Lose"}
                  </h3>
                </div>
              </div>
            ) : null}
            {roundTimer !== null && phase === "PLAYING" ? (
              <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white">
                {roundTimer}s
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="party-card space-y-3">
          <h3 className="text-lg font-semibold">Waiting for host</h3>
          <p className="text-sm text-illuvrse-muted">No round yet. Get ready for the chaos.</p>
        </section>
      )}

      {phase === "INTERMISSION" ? (
        <section className="party-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Round Results</h3>
            <p className="text-sm text-illuvrse-muted">
              Next round in {roomState?.intermissionEndsAt ? formatTimer(roomState.intermissionEndsAt, now) : "--"}s
            </p>
          </div>
          <div className="space-y-2">
            {lastRoundResults.map((result) => (
              <div
                key={result.playerId}
                className="flex items-center justify-between rounded-2xl border border-illuvrse-border bg-white/70 px-4 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {roomState?.players[result.playerId]?.name ?? result.playerId}
                  </span>
                  <span className="rounded-full bg-illuvrse-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-illuvrse-primary">
                    #{result.placement}
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                    {result.win ? "WIN" : "LOSE"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                    Raw {Math.round(result.rawScore)}
                  </span>
                  <span className="text-lg font-semibold">+{result.pointsAwarded}</span>
                </div>
              </div>
            ))}
          </div>
          {isHost ? (
            <div className="flex justify-end">
              <button
                className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                onClick={handleNextRound}
              >
                Next Round
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {phase === "SESSION_END" ? (
        <section className="party-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Final Results</h3>
            {isHost ? (
              <button
                className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                onClick={handleResetSession}
              >
                Play Again
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {scoreboard.slice(0, 3).map((entry, idx) => (
              <div
                key={entry.id}
                className="rounded-3xl border border-illuvrse-border bg-white/80 p-4 text-center"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Place {idx + 1}</p>
                <h4 className="mt-2 text-lg font-semibold">{entry.name}</h4>
                <p className="mt-1 text-2xl font-semibold">
                  {scores[entry.id] ?? roomState?.scoreboard.partyPointsByPlayerId[entry.id] ?? 0}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Scoreboard</h3>
          <p className="text-sm text-illuvrse-muted">
            {phase === "SESSION_END" ? "Final standings" : "Party points"}
          </p>
        </div>
        <div className="space-y-2">
          {scoreboard.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-2xl border border-illuvrse-border bg-white/70 px-4 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold">{entry.name}</span>
                {roomState?.hostId === entry.id ? (
                  <span className="rounded-full bg-illuvrse-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-illuvrse-primary">
                    Host
                  </span>
                ) : null}
                {entry.isReady ? (
                  <span className="rounded-full bg-illuvrse-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-illuvrse-success">
                    Ready
                  </span>
                ) : null}
                {entry.role === "spectator" ? (
                  <span className="rounded-full bg-illuvrse-border px-2 py-0.5 text-[10px] font-semibold uppercase text-illuvrse-muted">
                    Spectator
                  </span>
                ) : null}
                {!entry.isConnected ? (
                  <span className="rounded-full bg-illuvrse-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-illuvrse-danger">
                    Offline
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">
                  {scores[entry.id] ?? roomState?.scoreboard.partyPointsByPlayerId[entry.id] ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <section className="party-card border border-illuvrse-danger/40 bg-illuvrse-danger/10 text-illuvrse-danger">
          {error}
        </section>
      ) : null}
    </div>
  );
}
