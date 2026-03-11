import { describe, expect, it, vi } from "vitest";
import { buildServiceDependencyHealth } from "@/lib/platformGovernance";

describe("service dependency health", () => {
  it("marks dependencies healthy when env and db probe are available", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://db");
    vi.stubEnv("REDIS_URL", "redis://cache");
    vi.stubEnv("S3_ENDPOINT", "https://s3.local");
    vi.stubEnv("S3_BUCKET", "illuvrse");
    vi.stubEnv("S3_ACCESS_KEY", "access");
    vi.stubEnv("S3_SECRET_KEY", "secret");
    vi.stubEnv("LIVEKIT_API_KEY", "lk_key");
    vi.stubEnv("LIVEKIT_API_SECRET", "lk_secret");

    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]) };
    const snapshot = await buildServiceDependencyHealth(prisma);

    expect(snapshot.summary.critical).toBeGreaterThan(0);
    expect(snapshot.summary.unhealthy).toBe(0);
    expect(snapshot.dependencies.find((item) => item.id === "postgres-primary")?.status).toBe("healthy");
  });

  it("marks dependency degraded/unhealthy when required env is missing or db probe fails", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgres://db");
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error("db down")) };
    const snapshot = await buildServiceDependencyHealth(prisma);

    expect(snapshot.dependencies.find((item) => item.id === "postgres-primary")?.status).toBe("unhealthy");
    expect(snapshot.summary.degraded + snapshot.summary.unhealthy).toBeGreaterThan(0);
  });
});
