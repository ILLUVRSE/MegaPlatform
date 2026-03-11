import Redis from "ioredis-mock";
import { beforeEach, describe, expect, test } from "vitest";
import {
  getMinigamePartyState,
  setMinigamePartyState,
  setRedisClient
} from "@illuvrse/world-state";
import {
  createMinigamePartyRoom,
  joinMinigamePartyRoom,
  leaveMinigamePartyRoom,
  nextMinigameRound,
  startMinigameRound,
  submitMinigameInput
} from "@/lib/minigame/party/service";
import {
  awardPointsForTesting,
  buildRoundResultsForTesting,
  getMinigamePartyRoomManager
} from "@/lib/minigame/party/roomManager";
import { generateRandomMinigame } from "@/lib/minigame/generator";
import {
  createRoomSchema,
  inputSchema,
  readySchema
} from "@/lib/minigame/party/validation";

describe("minigame party rooms", () => {
  beforeEach(() => {
    const redis = new Redis();
    setRedisClient(redis as never);
  });

  test("room lifecycle create/join/leave", async () => {
    const create = await createMinigamePartyRoom("Hosty");
    const join = await joinMinigamePartyRoom(create.code, "Player 2");

    const state = await getMinigamePartyState(create.code);
    expect(state).not.toBeNull();
    expect(Object.keys(state!.players)).toHaveLength(2);

    await leaveMinigamePartyRoom(create.code, join.playerId);
    const afterLeave = await getMinigamePartyState(create.code);
    expect(Object.keys(afterLeave!.players)).toHaveLength(1);
  });

  test("deterministic spec for same seed", () => {
    const seed = "deadbeef";
    const first = generateRandomMinigame({ seed });
    const second = generateRandomMinigame({ seed });
    expect(first).toEqual(second);
  });

  test("state transitions include intermission and session end", async () => {
    const create = await createMinigamePartyRoom("Hosty");
    const join = await joinMinigamePartyRoom(create.code, "Player 2");
    const state = await getMinigamePartyState(create.code);
    state!.config.roundsTotal = 2;
    await setMinigamePartyState(create.code, state!);

    await startMinigameRound(create.code, create.playerId, true);
    let updated = await getMinigamePartyState(create.code);
    expect(updated?.phase).toBe("COUNTDOWN");

    await getMinigamePartyRoomManager().finishRoundForTesting(create.code);
    updated = await getMinigamePartyState(create.code);
    expect(updated?.phase).toBe("INTERMISSION");

    await nextMinigameRound(create.code, create.playerId);
    updated = await getMinigamePartyState(create.code);
    expect(updated?.phase).toBe("COUNTDOWN");

    await getMinigamePartyRoomManager().finishRoundForTesting(create.code);
    updated = await getMinigamePartyState(create.code);
    expect(updated?.phase).toBe("SESSION_END");
  });

  test("scoring placements award points", () => {
    expect(awardPointsForTesting(2, 1)).toBe(3);
    expect(awardPointsForTesting(2, 2)).toBe(1);
    expect(awardPointsForTesting(4, 1)).toBe(3);
    expect(awardPointsForTesting(4, 2)).toBe(2);
    expect(awardPointsForTesting(4, 3)).toBe(1);
    expect(awardPointsForTesting(4, 4)).toBe(0);

    const state = {
      players: {
        a: { id: "a", role: "player" },
        b: { id: "b", role: "player" },
        c: { id: "c", role: "player" }
      }
    } as never;

    const runtimes = new Map<string, any>();
    runtimes.set("a", {
      getScore: () => 10,
      getHudState: () => ({ result: "win" }),
      getCompletionTimeSeconds: () => 1
    });
    runtimes.set("b", {
      getScore: () => 5,
      getHudState: () => ({ result: "lose" }),
      getCompletionTimeSeconds: () => 2
    });
    runtimes.set("c", {
      getScore: () => 3,
      getHudState: () => ({ result: "lose" }),
      getCompletionTimeSeconds: () => 3
    });

    const results = buildRoundResultsForTesting(state as never, runtimes as never);
    expect(results[0].pointsAwarded).toBe(3);
    expect(results[1].pointsAwarded).toBe(2);
    expect(results[2].pointsAwarded).toBe(1);
  });

  test("spectator input ignored", async () => {
    const create = await createMinigamePartyRoom("Hosty");
    const join = await joinMinigamePartyRoom(create.code, "Player 2");
    const state = await getMinigamePartyState(create.code);
    state!.players[join.playerId].role = "spectator";
    await setMinigamePartyState(create.code, state!);

    await startMinigameRound(create.code, create.playerId, true);
    const result = await submitMinigameInput(create.code, join.playerId, {
      keysDown: {},
      keysPressed: {},
      mouse: { x: 0, y: 0, down: false, clicked: false }
    });
    expect(result.ok).toBe(false);
  });

  test("ready check gating", () => {
    expect(createRoomSchema.safeParse({ playerName: "" }).success).toBe(false);
    expect(readySchema.safeParse({ ready: true }).success).toBe(true);
    expect(
      inputSchema.safeParse({
        playerId: "abc",
        t: -1,
        input: { keysDown: {}, keysPressed: {}, mouse: { x: 0, y: 0, down: false, clicked: false } }
      }).success
    ).toBe(false);
  });

  test("start blocked when not all ready", async () => {
    const create = await createMinigamePartyRoom("Hosty");
    await joinMinigamePartyRoom(create.code, "Player 2");
    await expect(startMinigameRound(create.code, create.playerId)).rejects.toThrow(
      "Not all players are ready"
    );
  });
});
