import type { MinigameSpec } from "@/lib/minigame/spec";
import type { HudState, InputSnapshot } from "@/lib/minigame/runtime/types";

export type PartyPhase = "LOBBY" | "COUNTDOWN" | "PLAYING" | "INTERMISSION" | "SESSION_END";

export type PartyPlayer = {
  id: string;
  name: string;
  role: "player" | "spectator";
  nextRole?: "player" | "spectator" | null;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: string;
  lastSeenAt: string;
};

export type PartyRound = {
  index: number;
  seed: string;
  spec: MinigameSpec;
  startAt: number;
  endAt: number;
};

export type PartyConfig = {
  roundsTotal: number;
  minPlayersToStart: number;
  readyTimeoutMs: number;
  intermissionMs: number;
};

export type PartyRoundResult = {
  playerId: string;
  rawScore: number;
  placement: number;
  pointsAwarded: number;
  win: boolean;
  completionTimeSeconds?: number | null;
};

export type PartyScoreboard = {
  partyPointsByPlayerId: Record<string, number>;
  lastRoundResults: PartyRoundResult[];
  history?: PartyRoundResult[][];
};

export type PartyState = {
  code: string;
  hostId: string;
  phase: PartyPhase;
  players: Record<string, PartyPlayer>;
  currentRound: PartyRound | null;
  config: PartyConfig;
  scoreboard: PartyScoreboard;
  locks: { lockedRosterDuringRound: boolean };
  readyCheckStartedAt?: number | null;
  intermissionEndsAt?: number | null;
  updatedAt: string;
};

export type PartySnapshot = {
  t: number;
  playerId: string;
  state: unknown;
  hud: HudState;
  scores: Record<string, number>;
};

export type PartyEvent =
  | { type: "room_state"; state: PartyState }
  | { type: "round_countdown"; startAt: number; roundIndex: number }
  | { type: "round_start"; seed: string; spec: MinigameSpec; startAt: number; endAt: number; roundIndex: number }
  | { type: "snapshot"; t: number; playerId: string; state: unknown; hud: HudState; scores: Record<string, number> }
  | { type: "round_end"; results: PartyRoundResult[]; scores: Record<string, number> }
  | { type: "intermission"; endsAt: number }
  | { type: "session_end"; scores: Record<string, number> }
  | { type: "error"; message: string };

export type PartyInputPayload = {
  playerId: string;
  t: number;
  input: InputSnapshot;
};
