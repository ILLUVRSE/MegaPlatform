/**
 * Unit tests for Redis-backed world-state helpers.
 * Request/response: validates seat reservation behavior with ioredis-mock.
 * Guard: uses mocked Redis client.
 */
import { describe, expect, it } from "vitest";
import RedisMock from "ioredis-mock";
import { reserveSeat, releaseSeat, setRedisClient, getState } from "@illuvrse/world-state";

describe("world-state", () => {
  it("reserves and releases seats", async () => {
    const redis = new RedisMock();
    setRedisClient(redis as unknown as Parameters<typeof setRedisClient>[0]);

    const reserve = await reserveSeat("party-1", 1, "user-1", 10_000, 12);
    expect(reserve.ok).toBe(true);

    const state = await getState("party-1", 12);
    expect(state.seats["1"].state).toBe("reserved");

    const release = await releaseSeat("party-1", 1, "user-1", 12);
    expect(release.ok).toBe(true);

    const stateAfter = await getState("party-1", 12);
    expect(stateAfter.seats["1"].state).toBe("available");
  });
});
