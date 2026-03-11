import Redis from "ioredis";
import type { Redis as RedisClient } from "ioredis";

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

type Bucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;
let redisClient: RedisClient | null | undefined;

export function resolveClientKey(request: Request, principalId: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `${principalId.slice(0, 128)}:${ip.slice(0, 128)}`;
}

function isRedisModeEnabled() {
  if (process.env.RATE_LIMIT_STORE === "memory") return false;
  return Boolean(process.env.REDIS_URL) || process.env.RATE_LIMIT_STORE === "redis";
}

function getRedisClient() {
  if (!isRedisModeEnabled()) {
    return null;
  }

  if (redisClient !== undefined) {
    return redisClient;
  }

  if (!process.env.REDIS_URL) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false
  });

  redisClient.on("error", () => {
    // Rate limiting degrades to the explicit local fallback only in non-production environments.
  });

  return redisClient;
}

async function connectRedis(client: RedisClient) {
  if (client.status === "wait") {
    await client.connect();
  }
}

async function checkRedisRateLimit(options: { key: string; windowMs: number; limit: number }): Promise<RateLimitResult | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    await connectRedis(client);
    const total = await client.incr(options.key);
    if (total === 1) {
      await client.pexpire(options.key, options.windowMs);
    }

    const ttlMs = await client.pttl(options.key);
    const retryAfterSec = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : options.windowMs) / 1000));

    if (total > options.limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSec
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, options.limit - total),
      retryAfterSec
    };
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Redis-backed rate limiting is required in production.");
    }
    return null;
  }
}

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function checkLocalRateLimit(options: { key: string; windowMs: number; limit: number }): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of sorted.slice(0, overflow)) {
      buckets.delete(key);
    }
  }

  const current = buckets.get(options.key);

  if (!current || current.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, retryAfterSec: Math.ceil(options.windowMs / 1000) };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  buckets.set(options.key, current);
  return {
    ok: true,
    remaining: Math.max(0, options.limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

export async function checkRateLimit(options: { key: string; windowMs: number; limit: number }) {
  const redisResult = await checkRedisRateLimit(options);
  if (redisResult) {
    return redisResult;
  }

  return checkLocalRateLimit(options);
}

export function __setRateLimitRedisClient(client: RedisClient | null) {
  redisClient = client;
}

export function __resetRateLimitState() {
  buckets.clear();
  redisClient = undefined;
}
