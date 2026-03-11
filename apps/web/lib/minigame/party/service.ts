import { randomUUID } from "crypto";
import { generateRandomMinigame } from "@/lib/minigame/generator";
import { randomSeed } from "@/lib/minigame/rng";
import type { InputSnapshot } from "@/lib/minigame/runtime/types";
import type { MinigameSpec } from "@/lib/minigame/spec";
import {
  getMinigamePartyState,
  publishMinigamePartyEvent,
  setMinigamePartyState
} from "@illuvrse/world-state";
import type {
  MinigamePartyConfig as PartyConfig,
  MinigamePartyRound as PartyRound,
  MinigamePartyRoundResult as PartyRoundResult,
  MinigamePartyState as PartyState
} from "@illuvrse/world-state";
import { getMinigamePartyRoomManager } from "./roomManager";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_CODE_ATTEMPTS = 6;
const DEFAULT_ROUNDS_TOTAL = 5;
const DEFAULT_READY_TIMEOUT_MS = 15000;
const DEFAULT_INTERMISSION_MS = 8000;
const COUNTDOWN_MS = 3000;

const generateCode = () => {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
};

const createUniqueCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    const existing = await getMinigamePartyState(code);
    if (!existing) return code;
  }
  throw new Error("Unable to generate party code");
};

const getRoundDurationSeconds = () =>
  process.env.NEXT_PUBLIC_E2E_FAST_TIMER === "1" ? 3 : 30;

const buildConfig = (): PartyConfig => {
  if (process.env.NEXT_PUBLIC_E2E_FAST_TIMER === "1") {
    return {
      roundsTotal: 2,
      minPlayersToStart: 2,
      readyTimeoutMs: 3000,
      intermissionMs: 2000
    };
  }
  return {
    roundsTotal: DEFAULT_ROUNDS_TOTAL,
    minPlayersToStart: 2,
    readyTimeoutMs: DEFAULT_READY_TIMEOUT_MS,
    intermissionMs: DEFAULT_INTERMISSION_MS
  };
};

const createRound = (index: number): PartyRound => {
  const seed = randomSeed();
  const spec: MinigameSpec = generateRandomMinigame({ seed });
  const startAt = Date.now() + COUNTDOWN_MS;
  const durationSeconds = getRoundDurationSeconds();
  const endAt = startAt + durationSeconds * 1000;
  return {
    index,
    seed,
    spec,
    startAt,
    endAt
  };
};

const getActivePlayers = (state: PartyState) =>
  Object.values(state.players).filter((player) => player.role === "player");

const getReadyPlayers = (state: PartyState) =>
  getActivePlayers(state).filter((player) => player.isReady);

const buildScores = (state: PartyState) => ({
  ...state.scoreboard.partyPointsByPlayerId
});

const touchPlayer = (state: PartyState, playerId: string) => {
  const player = state.players[playerId];
  if (!player) return;
  player.lastSeenAt = new Date().toISOString();
  player.isConnected = true;
};

export const createMinigamePartyRoom = async (playerName: string) => {
  const code = await createUniqueCode();
  const playerId = randomUUID();
  const now = new Date().toISOString();
  const config = buildConfig();
  const state: PartyState = {
    code,
    hostId: playerId,
    phase: "LOBBY",
    players: {
      [playerId]: {
        id: playerId,
        name: playerName,
        role: "player",
        nextRole: null,
        isReady: false,
        isConnected: true,
        joinedAt: now,
        lastSeenAt: now
      }
    },
    currentRound: null,
    config,
    scoreboard: {
      partyPointsByPlayerId: { [playerId]: 0 },
      lastRoundResults: []
    },
    locks: {
      lockedRosterDuringRound: false
    },
    readyCheckStartedAt: null,
    intermissionEndsAt: null,
    updatedAt: now
  };

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });

  return { code, playerId, hostId: playerId };
};

export const joinMinigamePartyRoom = async (code: string, playerName: string) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  if (state.phase === "SESSION_END") {
    throw new Error("Session ended");
  }

  const now = new Date().toISOString();
  const playerId = randomUUID();
  const isPlaying = state.phase === "PLAYING" || state.phase === "COUNTDOWN";
  const role: "player" | "spectator" = isPlaying || state.locks.lockedRosterDuringRound
    ? "spectator"
    : "player";

  state.players[playerId] = {
    id: playerId,
    name: playerName,
    role,
    nextRole: role === "spectator" ? "player" : null,
    isReady: false,
    isConnected: true,
    joinedAt: now,
    lastSeenAt: now
  };
  if (!state.scoreboard.partyPointsByPlayerId[playerId]) {
    state.scoreboard.partyPointsByPlayerId[playerId] = 0;
  }

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });
  return { playerId, role };
};

export const leaveMinigamePartyRoom = async (code: string, playerId: string) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }

  delete state.players[playerId];

  const remaining = Object.values(state.players);
  if (remaining.length === 0) {
    state.phase = "SESSION_END";
    state.currentRound = null;
  } else if (state.hostId === playerId) {
    const nextHost = remaining
      .filter((player) => player.isConnected)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())[0];
    if (nextHost) {
      state.hostId = nextHost.id;
    }
  }

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });

  return { ok: true };
};

export const setMinigameReady = async (code: string, playerId: string, ready: boolean) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  const player = state.players[playerId];
  if (!player) {
    throw new Error("Player not found");
  }
  if (player.role !== "player" && ready) {
    player.nextRole = "player";
  }
  player.isReady = ready;
  touchPlayer(state, playerId);

  if (ready && !state.readyCheckStartedAt) {
    state.readyCheckStartedAt = Date.now();
  }

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });
  return { ok: true };
};

export const setMinigameRole = async (
  code: string,
  playerId: string,
  role: "player" | "spectator"
) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  const player = state.players[playerId];
  if (!player) {
    throw new Error("Player not found");
  }

  if (state.phase === "PLAYING" || state.phase === "COUNTDOWN") {
    player.role = "spectator";
    player.nextRole = role;
  } else {
    player.role = role;
    player.nextRole = null;
    player.isReady = false;
  }
  if (state.scoreboard.partyPointsByPlayerId[player.id] === undefined) {
    state.scoreboard.partyPointsByPlayerId[player.id] = 0;
  }

  touchPlayer(state, playerId);
  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });
  return { ok: true };
};

export const pingMinigamePartyPlayer = async (code: string, playerId: string) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  if (!state.players[playerId]) {
    throw new Error("Player not found");
  }
  touchPlayer(state, playerId);
  await setMinigamePartyState(code, state);
  return { ok: true };
};

const canStartRound = (state: PartyState) => {
  const activePlayers = getActivePlayers(state);
  if (activePlayers.length < state.config.minPlayersToStart) return false;
  const readyPlayers = getReadyPlayers(state);
  return readyPlayers.length === activePlayers.length;
};

export const startMinigameRound = async (
  code: string,
  playerId: string,
  forceStart = false
) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  if (state.hostId !== playerId) {
    throw new Error("Only host can start rounds");
  }
  if (state.phase === "PLAYING" || state.phase === "COUNTDOWN") {
    throw new Error("Round already in progress");
  }
  if (state.phase === "SESSION_END") {
    throw new Error("Session ended");
  }

  const nextRoundIndex = (state.currentRound?.index ?? -1) + 1;
  if (nextRoundIndex >= state.config.roundsTotal) {
    throw new Error("Session complete");
  }

  Object.values(state.players).forEach((player) => {
    if (player.nextRole) {
      player.role = player.nextRole;
      player.nextRole = null;
    }
    if (state.scoreboard.partyPointsByPlayerId[player.id] === undefined) {
      state.scoreboard.partyPointsByPlayerId[player.id] = 0;
    }
  });

  if (!canStartRound(state)) {
    const now = Date.now();
    if (!state.readyCheckStartedAt) {
      state.readyCheckStartedAt = now;
    }
    const waited = now - (state.readyCheckStartedAt ?? now);
    if (!forceStart && waited < state.config.readyTimeoutMs) {
      await setMinigamePartyState(code, state);
      await publishMinigamePartyEvent(code, { type: "room_state", state });
      throw new Error("Not all players are ready");
    }
  }

  state.readyCheckStartedAt = null;
  state.phase = "COUNTDOWN";
  state.locks.lockedRosterDuringRound = true;
  state.intermissionEndsAt = null;
  state.scoreboard.lastRoundResults = [];
  state.currentRound = createRound(nextRoundIndex);

  Object.values(state.players).forEach((player) => {
    player.isReady = false;
  });

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });
  await publishMinigamePartyEvent(code, {
    type: "round_countdown",
    startAt: state.currentRound.startAt,
    roundIndex: state.currentRound.index
  });
  await publishMinigamePartyEvent(code, {
    type: "round_start",
    seed: state.currentRound.seed,
    spec: state.currentRound.spec,
    startAt: state.currentRound.startAt,
    endAt: state.currentRound.endAt,
    roundIndex: state.currentRound.index
  });

  getMinigamePartyRoomManager().startRound(state);

  return { ok: true };
};

export const nextMinigameRound = async (code: string, playerId: string) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  if (state.hostId !== playerId) {
    throw new Error("Only host can start rounds");
  }
  if (state.phase !== "INTERMISSION") {
    throw new Error("Not in intermission");
  }

  return startMinigameRound(code, playerId, true);
};

export const endMinigameSession = async (code: string, playerId: string) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  if (state.hostId !== playerId) {
    throw new Error("Only host can end sessions");
  }

  state.phase = "SESSION_END";
  state.currentRound = null;
  state.locks.lockedRosterDuringRound = false;

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });
  await publishMinigamePartyEvent(code, { type: "session_end", scores: buildScores(state) });
  getMinigamePartyRoomManager().stopRoom(code);

  return { ok: true, scores: buildScores(state) };
};

export const resetMinigameSession = async (code: string, playerId: string) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  if (state.hostId !== playerId) {
    throw new Error("Only host can reset sessions");
  }

  state.phase = "LOBBY";
  state.currentRound = null;
  state.locks.lockedRosterDuringRound = false;
  state.scoreboard.lastRoundResults = [];
  state.scoreboard.partyPointsByPlayerId = Object.values(state.players).reduce<Record<string, number>>(
    (acc, player) => {
      acc[player.id] = 0;
      return acc;
    },
    {}
  );
  state.intermissionEndsAt = null;
  state.readyCheckStartedAt = null;
  Object.values(state.players).forEach((player) => {
    player.isReady = false;
    player.role = player.role === "spectator" ? "spectator" : "player";
    player.nextRole = null;
  });

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });

  return { ok: true };
};

export const submitMinigameInput = async (
  code: string,
  playerId: string,
  input: InputSnapshot
) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }
  const player = state.players[playerId];
  if (!player) {
    throw new Error("Player not found");
  }
  if (state.phase !== "PLAYING") {
    return { ok: false };
  }
  if (player.role !== "player") {
    return { ok: false };
  }

  touchPlayer(state, playerId);
  await setMinigamePartyState(code, state);

  getMinigamePartyRoomManager().submitInput(code, playerId, input);
  return { ok: true };
};

export const recordRoundResults = async (
  code: string,
  results: PartyRoundResult[]
) => {
  const state = await getMinigamePartyState(code);
  if (!state) {
    throw new Error("Room not found");
  }

  state.scoreboard.lastRoundResults = results;
  results.forEach((result) => {
    state.scoreboard.partyPointsByPlayerId[result.playerId] =
      (state.scoreboard.partyPointsByPlayerId[result.playerId] ?? 0) + result.pointsAwarded;
  });

  await setMinigamePartyState(code, state);
  await publishMinigamePartyEvent(code, { type: "room_state", state });
  await publishMinigamePartyEvent(code, {
    type: "round_end",
    results,
    scores: buildScores(state)
  });
};
