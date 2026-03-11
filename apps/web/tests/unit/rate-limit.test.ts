import RedisMock from "ioredis-mock";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetRateLimitState,
  __setRateLimitRedisClient,
  checkRateLimit
} from "@/src/domains/platform-core/rate-limit";

describe("distributed rate limiting", () => {
  afterEach(() => {
    __setRateLimitRedisClient(null);
    __resetRateLimitState();
    vi.unstubAllEnvs();
  });

  it("uses Redis counters when available", async () => {
    vi.stubEnv("REDIS_URL", "redis://cache:6379");
    const redis = new RedisMock();
    __setRateLimitRedisClient(redis as never);

    const first = await checkRateLimit({ key: "upload:test", windowMs: 60_000, limit: 2 });
    const second = await checkRateLimit({ key: "upload:test", windowMs: 60_000, limit: 2 });
    const third = await checkRateLimit({ key: "upload:test", windowMs: 60_000, limit: 2 });

    expect(first.ok).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it("falls back to local memory outside production when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RATE_LIMIT_STORE", "redis");
    vi.stubEnv("REDIS_URL", "redis://cache:6379");
    __setRateLimitRedisClient({
      status: "wait",
      connect: vi.fn().mockRejectedValue(new Error("offline"))
    } as never);

    const first = await checkRateLimit({ key: "fallback:test", windowMs: 1000, limit: 1 });
    const second = await checkRateLimit({ key: "fallback:test", windowMs: 1000, limit: 1 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });
});
