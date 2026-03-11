import { MinigameHeadlessRuntime } from "@/lib/minigame/runtime";
import type { InputSnapshot } from "@/lib/minigame/runtime/types";
import { createControllerForSpec } from "@/lib/minigame/templates";
import type { MinigameSpec } from "@/lib/minigame/spec";
import {
  getMinigamePartyState,
  publishMinigamePartyEvent,
  setMinigamePartyState,
  type MinigamePartyRoundResult,
  type MinigamePartyState
} from "@illuvrse/world-state";

const FIXED_DT = 1 / 60;
const SNAPSHOT_INTERVAL_MS = 1000 / 15;
const INPUT_RATE_LIMIT = 30;
const DISCONNECT_THRESHOLD_MS = 15000;

type InputBuffer = {
  keysDown: Record<string, boolean>;
  keysPressed: Record<string, boolean>;
  mouse: { x: number; y: number; down: boolean };
  mouseClicked: boolean;
};

type InputRateWindow = {
  windowStart: number;
  count: number;
};

const createEmptyInput = (): InputBuffer => ({
  keysDown: {},
  keysPressed: {},
  mouse: { x: 0, y: 0, down: false },
  mouseClicked: false
});

type RoomRuntime = {
  code: string;
  state: MinigamePartyState;
  runtimes: Map<string, MinigameHeadlessRuntime>;
  inputs: Map<string, InputBuffer>;
  inputRates: Map<string, InputRateWindow>;
  intervalId: ReturnType<typeof setInterval> | null;
  lastSnapshotAt: number;
  lastPresenceCheckAt: number;
};

class MinigamePartyRoomManager {
  private rooms = new Map<string, RoomRuntime>();

  startRound(state: MinigamePartyState) {
    const existing = this.rooms.get(state.code);
    if (existing?.intervalId) {
      clearInterval(existing.intervalId);
    }

    const runtimes = new Map<string, MinigameHeadlessRuntime>();
    const inputs = new Map<string, InputBuffer>();
    const inputRates = new Map<string, InputRateWindow>();

    Object.values(state.players)
      .filter((player) => player.role === "player")
      .forEach((player) => {
        const spec = state.currentRound!.spec as MinigameSpec;
        const controller = createControllerForSpec(spec);
        const runtime = new MinigameHeadlessRuntime({
          spec,
          controller
        });
        runtimes.set(player.id, runtime);
        inputs.set(player.id, createEmptyInput());
        inputRates.set(player.id, { windowStart: Date.now(), count: 0 });
      });

    const room: RoomRuntime = {
      code: state.code,
      state,
      runtimes,
      inputs,
      inputRates,
      intervalId: null,
      lastSnapshotAt: 0,
      lastPresenceCheckAt: Date.now()
    };

    const tick = async () => {
      const now = Date.now();

      if (room.state.phase === "COUNTDOWN" && now >= (room.state.currentRound?.startAt ?? 0)) {
        room.state.phase = "PLAYING";
        await setMinigamePartyState(room.code, room.state);
        await publishMinigamePartyEvent(room.code, { type: "room_state", state: room.state });
      }

      if (now - room.lastPresenceCheckAt >= 1000) {
        await this.syncPresence(room, now);
        room.lastPresenceCheckAt = now;
      }

      if (room.state.phase !== "PLAYING") return;

      const results: Record<string, "win" | "lose" | null> = {};
      room.runtimes.forEach((runtime, playerId) => {
        const buffer = room.inputs.get(playerId) ?? createEmptyInput();
        const snapshot: InputSnapshot = {
          keysDown: buffer.keysDown,
          keysPressed: buffer.keysPressed,
          mouse: {
            x: buffer.mouse.x,
            y: buffer.mouse.y,
            down: buffer.mouse.down,
            clicked: buffer.mouseClicked
          }
        };
        buffer.keysPressed = {};
        buffer.mouseClicked = false;
        room.inputs.set(playerId, buffer);
        runtime.applyInput(snapshot);
        runtime.step(FIXED_DT);
        results[playerId] = runtime.getHudState().result;
      });

      if (now - room.lastSnapshotAt >= SNAPSHOT_INTERVAL_MS) {
        const scores = buildScores(room.state);
        room.runtimes.forEach((runtime, playerId) => {
          publishMinigamePartyEvent(room.code, {
            type: "snapshot",
            t: now,
            playerId,
            state: runtime.serializeState(),
            hud: runtime.getHudState(),
            scores
          });
        });
        room.lastSnapshotAt = now;
      }

      const allDone = Object.values(results).every((result) => result);
      if (allDone || now >= (room.state.currentRound?.endAt ?? now + 1)) {
        await this.finishRound(room);
      }
    };

    room.intervalId = setInterval(() => {
      void tick();
    }, 1000 / 60);

    this.rooms.set(state.code, room);
  }

  submitInput(code: string, playerId: string, input: InputSnapshot) {
    const room = this.rooms.get(code);
    if (!room) return;

    const now = Date.now();
    const rate = room.inputRates.get(playerId) ?? { windowStart: now, count: 0 };
    if (now - rate.windowStart >= 1000) {
      rate.windowStart = now;
      rate.count = 0;
    }
    rate.count += 1;
    room.inputRates.set(playerId, rate);
    if (rate.count > INPUT_RATE_LIMIT) return;

    const buffer = room.inputs.get(playerId) ?? createEmptyInput();
    buffer.keysDown = input.keysDown ?? {};
    buffer.keysPressed = { ...buffer.keysPressed, ...input.keysPressed };
    buffer.mouse = {
      x: input.mouse.x,
      y: input.mouse.y,
      down: input.mouse.down
    };
    if (input.mouse.clicked) {
      buffer.mouseClicked = true;
    }
    room.inputs.set(playerId, buffer);
  }

  stopRoom(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    if (room.intervalId) {
      clearInterval(room.intervalId);
    }
    this.rooms.delete(code);
  }

  // Test-only helper to force round completion.
  async finishRoundForTesting(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    await this.finishRound(room);
  }

  private async syncPresence(room: RoomRuntime, now: number) {
    const latest = await getMinigamePartyState(room.code);
    if (!latest) return;

    let dirty = false;
    Object.values(latest.players).forEach((player) => {
      const lastSeen = new Date(player.lastSeenAt).getTime();
      const connected = now - lastSeen <= DISCONNECT_THRESHOLD_MS;
      if (player.isConnected !== connected) {
        player.isConnected = connected;
        dirty = true;
      }
    });

    if (dirty) {
      room.state = latest;
      await setMinigamePartyState(room.code, latest);
      await publishMinigamePartyEvent(room.code, { type: "room_state", state: latest });
    }
  }

  private async finishRound(room: RoomRuntime) {
    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = null;
    }

    const latest = await getMinigamePartyState(room.code);
    if (!latest) return;

    const results = buildRoundResults(latest, room.runtimes);
    const scores = buildScores(latest);

    latest.scoreboard.lastRoundResults = results;
    results.forEach((result) => {
      latest.scoreboard.partyPointsByPlayerId[result.playerId] =
        (latest.scoreboard.partyPointsByPlayerId[result.playerId] ?? 0) + result.pointsAwarded;
    });

    const isLastRound = (latest.currentRound?.index ?? 0) + 1 >= latest.config.roundsTotal;
    latest.locks.lockedRosterDuringRound = false;

    Object.values(latest.players).forEach((player) => {
      if (player.nextRole) {
        player.role = player.nextRole;
        player.nextRole = null;
        player.isReady = false;
      }
    });

    if (isLastRound) {
      latest.phase = "SESSION_END";
      latest.currentRound = null;
      latest.intermissionEndsAt = null;
      await setMinigamePartyState(room.code, latest);
      await publishMinigamePartyEvent(room.code, { type: "room_state", state: latest });
      await publishMinigamePartyEvent(room.code, { type: "round_end", results, scores: buildScores(latest) });
      await publishMinigamePartyEvent(room.code, { type: "session_end", scores: buildScores(latest) });
      room.state = latest;
      return;
    }

    latest.phase = "INTERMISSION";
    latest.intermissionEndsAt = Date.now() + latest.config.intermissionMs;

    await setMinigamePartyState(room.code, latest);
    await publishMinigamePartyEvent(room.code, { type: "room_state", state: latest });
    await publishMinigamePartyEvent(room.code, { type: "round_end", results, scores: buildScores(latest) });
    await publishMinigamePartyEvent(room.code, { type: "intermission", endsAt: latest.intermissionEndsAt ?? Date.now() });

    room.state = latest;

    if (latest.intermissionEndsAt) {
      setTimeout(async () => {
        const refreshed = await getMinigamePartyState(room.code);
        if (!refreshed) return;
        if (refreshed.phase !== "INTERMISSION") return;
        await publishMinigamePartyEvent(room.code, { type: "intermission", endsAt: refreshed.intermissionEndsAt ?? Date.now() });
      }, latest.config.intermissionMs);
    }
  }
}

const buildScores = (state: MinigamePartyState) => ({
  ...state.scoreboard.partyPointsByPlayerId
});

const buildRoundResults = (
  state: MinigamePartyState,
  runtimes: Map<string, MinigameHeadlessRuntime>
): MinigamePartyRoundResult[] => {
  const players = Object.values(state.players).filter((player) => player.role === "player");
  const raw = players.map((player) => {
    const runtime = runtimes.get(player.id);
    const rawScore = runtime?.getScore() ?? 0;
    const win = runtime?.getHudState().result === "win";
    return {
      playerId: player.id,
      rawScore,
      win,
      completionTimeSeconds: runtime?.getCompletionTimeSeconds() ?? null
    };
  });

  raw.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    if (a.completionTimeSeconds !== null && b.completionTimeSeconds !== null) {
      if (a.completionTimeSeconds !== b.completionTimeSeconds) {
        return a.completionTimeSeconds - b.completionTimeSeconds;
      }
    }
    return a.playerId.localeCompare(b.playerId);
  });

  return raw.map((entry, index) => {
    const placement = index + 1;
    const pointsAwarded = awardPoints(raw.length, placement);
    return {
      playerId: entry.playerId,
      rawScore: entry.rawScore,
      placement,
      pointsAwarded,
      win: entry.win,
      completionTimeSeconds: entry.completionTimeSeconds
    };
  });
};

const awardPoints = (playerCount: number, placement: number) => {
  if (playerCount <= 1) return placement === 1 ? 3 : 0;
  if (playerCount === 2) {
    return placement === 1 ? 3 : 1;
  }
  if (placement === 1) return 3;
  if (placement === 2) return 2;
  if (placement === 3) return 1;
  return 0;
};

// Test helpers
export const awardPointsForTesting = awardPoints;
export const buildRoundResultsForTesting = buildRoundResults;

let sharedManager: MinigamePartyRoomManager | null = null;

export const getMinigamePartyRoomManager = () => {
  if (!sharedManager) {
    sharedManager = new MinigamePartyRoomManager();
  }
  return sharedManager;
};
