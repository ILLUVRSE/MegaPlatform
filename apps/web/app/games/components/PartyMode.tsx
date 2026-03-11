"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { deriveSeed, randomSeed } from "@/lib/minigame/rng";
import { generateRandomMinigame } from "@/lib/minigame/generator";
import type { MinigameSpec } from "@/lib/minigame/spec";
import MinigameFrame from "./MinigameFrame";

type PartyPlayer = {
  id: string;
  name: string;
  wins: number;
  losses: number;
};

type RoundRecord = {
  round: number;
  seed: string;
  title: string;
  templateId: string;
  results: Record<string, "win" | "lose">;
};

type PartyPhase = "lobby" | "playing" | "round-summary" | "final";

const DEFAULT_PLAYERS = ["Player 1", "Player 2"];
const ROUND_OPTIONS = [3, 5, 7, 9];
const MAX_PLAYERS = 8;

const makePlayer = (name: string): PartyPlayer => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${name}`,
  name,
  wins: 0,
  losses: 0
});

const normalizePlayers = (players: PartyPlayer[]) =>
  players.map((player, index) => ({
    ...player,
    name: player.name.trim() || `Player ${index + 1}`
  }));

export default function PartyMode() {
  const [phase, setPhase] = useState<PartyPhase>("lobby");
  const [players, setPlayers] = useState<PartyPlayer[]>(
    DEFAULT_PLAYERS.map((name) => makePlayer(name))
  );
  const [roundsTotal, setRoundsTotal] = useState(5);
  const [partySeed, setPartySeed] = useState(() => randomSeed());
  const [roundIndex, setRoundIndex] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundRecord[]>([]);
  const [turnStarted, setTurnStarted] = useState(false);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [customSpec, setCustomSpec] = useState<MinigameSpec | null>(null);
  const [customStatus, setCustomStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const searchParams = useSearchParams();
  const gamegridId = searchParams.get("gamegridId");

  const currentPlayer = players[playerIndex];
  const roundSeed = useMemo(
    () => (customSpec ? customSpec.seed : deriveSeed(partySeed, `round-${roundIndex + 1}`)),
    [partySeed, roundIndex, customSpec]
  );
  const roundSpec = useMemo<MinigameSpec>(
    () => customSpec ?? generateRandomMinigame({ seed: roundSeed }),
    [roundSeed, customSpec]
  );

  const standings = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
  }, [players]);

  const currentRoundRecord = roundResults[roundIndex];
  const isLastPlayer = playerIndex >= players.length - 1;
  const isLastRound = roundIndex >= roundsTotal - 1;

  const continueLabel = isLastPlayer
    ? isLastRound
      ? "View Final Results"
      : "Round Summary"
    : "Next Player";

  const canStartParty =
    players.length >= 2 && players.every((player) => player.name.trim().length > 0);

  const handleAddPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    const nextName = draftName.trim() || `Player ${players.length + 1}`;
    setPlayers((prev) => [...prev, makePlayer(nextName)]);
    setDraftName("");
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((player) => player.id !== id));
  };

  const handleUpdatePlayer = (id: string, name: string) => {
    setPlayers((prev) =>
      prev.map((player) => (player.id === id ? { ...player, name } : player))
    );
  };

  const handleStartParty = () => {
    if (!canStartParty) return;
    setPlayers((prev) => normalizePlayers(prev).map((player) => ({ ...player, wins: 0, losses: 0 })));
    if (!partySeed.trim()) {
      setPartySeed(randomSeed());
    }
    setRoundResults([]);
    setRoundIndex(0);
    setPlayerIndex(0);
    setTurnStarted(false);
    setAwaitingContinue(false);
    setPhase("playing");
  };

  const handleGameOver = (result: "win" | "lose") => {
    const playerId = currentPlayer?.id;
    if (!playerId) return;
    if (currentRoundRecord?.results[playerId]) return;

    setRoundResults((prev) => {
      const next = [...prev];
      const record: RoundRecord =
        next[roundIndex] ??
        ({
          round: roundIndex + 1,
          seed: roundSeed,
          title: roundSpec.title,
          templateId: roundSpec.templateId,
          results: {}
        } as RoundRecord);

      record.results[playerId] = result;
      next[roundIndex] = record;
      return next;
    });

    setPlayers((prev) =>
      prev.map((player) => {
        if (player.id !== playerId) return player;
        return {
          ...player,
          wins: player.wins + (result === "win" ? 1 : 0),
          losses: player.losses + (result === "lose" ? 1 : 0)
        };
      })
    );

    setAwaitingContinue(true);
  };

  const handleContinue = () => {
    if (!awaitingContinue) return;
    setAwaitingContinue(false);
    setTurnStarted(false);
    if (!isLastPlayer) {
      setPlayerIndex((prev) => prev + 1);
      return;
    }
    if (isLastRound) {
      setPhase("final");
      return;
    }
    setPhase("round-summary");
  };

  const handleNextRound = () => {
    setRoundIndex((prev) => prev + 1);
    setPlayerIndex(0);
    setTurnStarted(false);
    setAwaitingContinue(false);
    setPhase("playing");
  };

  const handleNewParty = () => {
    setPhase("lobby");
    setRoundIndex(0);
    setPlayerIndex(0);
    setTurnStarted(false);
    setAwaitingContinue(false);
  };

  const handleShuffleSeed = () => {
    setPartySeed(randomSeed());
  };

  useEffect(() => {
    if (!gamegridId) return;
    setCustomStatus("loading");
    fetch(`/api/gamegrid/games/${gamegridId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.game?.specJson) {
          setCustomSpec(data.game.specJson as MinigameSpec);
          setCustomStatus("ready");
        } else {
          setCustomStatus("error");
        }
      })
      .catch(() => setCustomStatus("error"));
  }, [gamegridId]);

  return (
    <div className="space-y-6">
      <header className="party-card space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Party Mode</p>
        <h1 className="text-3xl font-semibold">Local Minigame Showdown</h1>
        <p className="text-sm text-illuvrse-muted">
          Round-based hot-seat chaos. Same seed per round, shared scoreboard.
        </p>
        {gamegridId ? (
          <div className="text-xs uppercase tracking-[0.3em] text-illuvrse-primary">
            GameGrid Spec: {customStatus === "ready" ? "Loaded" : customStatus}
          </div>
        ) : null}
      </header>

      {phase === "lobby" ? (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="party-card space-y-4">
            <h2 className="text-xl font-semibold">Lobby</h2>
            <div className="space-y-3">
              {players.map((player, index) => (
                <div key={player.id} className="flex flex-wrap items-center gap-3">
                  <span className="w-16 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                    P{index + 1}
                  </span>
                  <input
                    className="flex-1 rounded-full border border-illuvrse-border bg-white px-4 py-2 text-sm"
                    value={player.name}
                    onChange={(event) => handleUpdatePlayer(player.id, event.target.value)}
                  />
                  {players.length > 2 ? (
                    <button className="text-xs uppercase tracking-[0.3em] text-illuvrse-primary" onClick={() => handleRemovePlayer(player.id)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="flex-1 rounded-full border border-illuvrse-border bg-white px-4 py-2 text-sm"
                placeholder="New player name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
              />
              <button className="party-button" onClick={handleAddPlayer} disabled={players.length >= MAX_PLAYERS}>
                Add Player
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-illuvrse-muted">
              <span>Rounds</span>
              {ROUND_OPTIONS.map((rounds) => (
                <button
                  key={rounds}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    roundsTotal === rounds ? "border-illuvrse-primary text-illuvrse-primary" : "border-illuvrse-border"
                  }`}
                  onClick={() => setRoundsTotal(rounds)}
                >
                  {rounds}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-full border border-illuvrse-border bg-white px-4 py-2 text-sm">
                <span className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Seed</span>
                <input
                  className="flex-1 bg-transparent text-sm"
                  value={partySeed}
                  onChange={(event) => setPartySeed(event.target.value)}
                />
              </div>
              <button className="party-button" onClick={handleShuffleSeed}>
                Shuffle Seed
              </button>
            </div>
            <button className="party-button text-lg" onClick={handleStartParty} disabled={!canStartParty}>
              Start Party
            </button>
          </div>

          <div className="party-card space-y-3">
            <h3 className="text-lg font-semibold">How it works</h3>
            <p className="text-sm text-illuvrse-muted">
              Each round uses one deterministic seed. Every player gets a turn on the exact same minigame.
            </p>
            <p className="text-sm text-illuvrse-muted">
              Wins score 1 point. Lowest losses break ties. Ready up before you start your turn.
            </p>
            <p className="text-sm text-illuvrse-muted">
              Recommended: play on a single keyboard and pass the controls each turn.
            </p>
          </div>
        </div>
      ) : null}

      {phase !== "lobby" ? (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="party-card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Round {roundIndex + 1} / {roundsTotal}</p>
                <h2 className="text-2xl font-semibold">{roundSpec.title}</h2>
                <p className="text-sm text-illuvrse-muted">Seed: {roundSeed}</p>
              </div>
              <div className="rounded-full bg-illuvrse-border px-4 py-2 text-sm">
                {currentPlayer ? `${currentPlayer.name}'s turn` : "Waiting"}
              </div>
            </div>

            {phase === "playing" ? (
              <div className="space-y-4">
                {!turnStarted ? (
                  <div className="party-card flex flex-col items-start gap-3">
                    <p className="text-sm text-illuvrse-muted">
                      Hand the controls to <span className="font-semibold text-illuvrse-primary">{currentPlayer?.name}</span>.
                    </p>
                    <button className="party-button" onClick={() => setTurnStarted(true)}>
                      Start Turn
                    </button>
                  </div>
                ) : (
                  <MinigameFrame
                    key={`${roundIndex}-${playerIndex}`}
                    spec={roundSpec}
                    mode="party"
                    showControls={false}
                    onGameOver={handleGameOver}
                    onContinue={handleContinue}
                    continueLabel={continueLabel}
                  />
                )}
              </div>
            ) : null}

            {phase === "round-summary" ? (
              <div className="party-card space-y-3">
                <h3 className="text-xl font-semibold">Round {roundIndex + 1} Summary</h3>
                <div className="space-y-2 text-sm">
                  {players.map((player) => {
                    const result = currentRoundRecord?.results[player.id];
                    return (
                      <div key={player.id} className="flex items-center justify-between rounded-full border border-illuvrse-border bg-white px-4 py-2">
                        <span>{player.name}</span>
                        <span className={result === "win" ? "text-emerald-600" : "text-rose-600"}>
                          {result === "win" ? "WIN" : "LOSE"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button className="party-button" onClick={handleNextRound}>
                  Start Round {roundIndex + 2}
                </button>
              </div>
            ) : null}

            {phase === "final" ? (
              <div className="party-card space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Final Results</p>
                <h2 className="text-2xl font-semibold">Party Champion</h2>
                <div className="space-y-2 text-sm">
                  {standings.map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between rounded-full border px-4 py-2 ${
                        index === 0 ? "border-illuvrse-primary bg-illuvrse-primary/10" : "border-illuvrse-border bg-white"
                      }`}
                    >
                      <span>{player.name}</span>
                      <span>
                        {player.wins}W / {player.losses}L
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="party-button" onClick={handleNewParty}>
                    New Party
                  </button>
                  <button className="party-button" onClick={() => setPhase("lobby")}>
                    Back to Lobby
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="party-card space-y-3">
              <h3 className="text-lg font-semibold">Scoreboard</h3>
              <div className="space-y-2 text-sm">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-full border px-4 py-2 ${
                      index === playerIndex && phase === "playing" ? "border-illuvrse-primary bg-illuvrse-primary/10" : "border-illuvrse-border bg-white"
                    }`}
                  >
                    <span>{player.name}</span>
                    <span>
                      {player.wins}W / {player.losses}L
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="party-card space-y-3">
              <h3 className="text-lg font-semibold">Round History</h3>
              {roundResults.length === 0 ? (
                <p className="text-sm text-illuvrse-muted">Results will appear here after each round.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {roundResults.map((record) => (
                    <div key={record.round} className="rounded-2xl border border-illuvrse-border bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Round {record.round}</p>
                      <p className="font-semibold">{record.title}</p>
                      <p className="text-xs text-illuvrse-muted">Seed: {record.seed}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
